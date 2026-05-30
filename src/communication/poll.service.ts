import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePollDto, PollOptionDto } from './dto/create-poll.dto';
import { CastVoteDto } from './dto/cast-vote.dto';
import { Poll, Prisma } from '@prisma/client';
import { CommunicationGateway } from './communication.gateway';

@Injectable()
export class PollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CommunicationGateway,
  ) {}

  private async validatePollAndVoteRequest(
    mahberId: string,
    pollId: string,
    memberId: string,
    dto: CastVoteDto,
  ) {
    const poll = await this.prisma.poll.findUnique({ where: { id: pollId } });

    if (!poll || poll.mahber_id !== mahberId) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    // Auto-close if deadline passed
    const closedPoll = await this.closeExpiredPoll(poll);

    if (closedPoll.is_closed) {
      throw new BadRequestException('Poll is closed');
    }

    // Check eligibility
    if (poll.eligibility_criteria) {
      const membership = await this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: memberId, status: 'Active' },
      });

      if (!membership) {
        throw new ForbiddenException('You are not eligible to vote');
      }

      const role = membership.role as { name?: string };
      if (role?.name !== poll.eligibility_criteria) {
        throw new ForbiddenException('You are not eligible to vote in this poll');
      }
    } else {
      // Verify active membership
      const membership = await this.prisma.membership.findFirst({
        where: { mahber_id: mahberId, member_id: memberId, status: 'Active' },
      });
      if (!membership) {
        throw new ForbiddenException('You must be an active member to vote');
      }
    }

    // Validate choices against poll options
    const options = poll.options as unknown as PollOptionDto[];
    const validOptionIds = new Set(options.map((o) => o.id));

    for (const choice of dto.choices) {
      if (!validOptionIds.has(choice)) {
        throw new BadRequestException(`Invalid option id: ${choice}`);
      }
    }

    if (poll.poll_type === 'SINGLE_CHOICE' && dto.choices.length !== 1) {
      throw new BadRequestException('Single-choice poll requires exactly one choice');
    }

    if (poll.poll_type === 'RANKED_CHOICE') {
      if (dto.choices.length === 0) {
        throw new BadRequestException('Ranked choice poll requires at least one choice');
      }
      const uniqueChoices = new Set(dto.choices);
      if (uniqueChoices.size !== dto.choices.length) {
        throw new BadRequestException('Ranked choice votes cannot contain duplicate options');
      }
    }

    return { poll, closedPoll };
  }

  async create(mahberId: string, actorId: string, dto: CreatePollDto) {
    const poll = await this.prisma.poll.create({
      data: {
        mahber_id: mahberId,
        question: dto.question,
        options: dto.options as unknown as Prisma.InputJsonValue,
        poll_type: dto.poll_type,
        voting_deadline: new Date(dto.voting_deadline),
        eligibility_criteria: dto.eligibility_criteria ?? null,
        created_by: actorId,
      },
    });

    // Emit event via WebSocket to the Mahber room
    this.gateway.server.to(`mahber_${mahberId}`).emit('new_poll', poll);

    return poll;
  }

  async findAll(mahberId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        where: { mahber_id: mahberId },
        include: { votes: true, creator: { select: { id: true, name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.poll.count({ where: { mahber_id: mahberId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async castVote(
    mahberId: string,
    pollId: string,
    memberId: string,
    dto: CastVoteDto,
  ) {
    await this.validatePollAndVoteRequest(mahberId, pollId, memberId, dto);

    // Prevent duplicate votes (enforce immutability)
    try {
      return await this.prisma.vote.create({
        data: {
          poll_id: pollId,
          member_id: memberId,
          choices: dto.choices,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('You have already voted in this poll');
      }
      throw err;
    }
  }

  async editVote(
    mahberId: string,
    pollId: string,
    memberId: string,
    dto: CastVoteDto,
  ) {
    const { poll: existingPoll } = await this.validatePollAndVoteRequest(
      mahberId,
      pollId,
      memberId,
      dto,
    );

    // Allow editing before deadline: create if missing, otherwise update.
    const vote = await this.prisma.vote.upsert({
      where: {
        poll_id_member_id: {
          poll_id: pollId,
          member_id: memberId,
        },
      },
      create: {
        poll_id: pollId,
        member_id: memberId,
        choices: dto.choices,
      },
      update: {
        choices: dto.choices,
      },
    });

    // Optional realtime update for clients listening on the Mahber room.
    this.gateway.server.to(`mahber_${existingPoll.mahber_id}`).emit('poll_vote_updated', {
      poll_id: pollId,
      member_id: memberId,
    });

    return vote;
  }

  async getResults(mahberId: string, pollId: string, actorId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { votes: true },
    });

    if (!poll || poll.mahber_id !== mahberId) {
      throw new NotFoundException(`Poll ${pollId} not found`);
    }

    // Auto-close if deadline passed
    const closedPoll = await this.closeExpiredPoll(poll);

    // Verify actor is an active member (admins can view real-time results)
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: actorId, status: 'Active' },
    });
    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    const options = closedPoll.options as unknown as PollOptionDto[];

    if (closedPoll.poll_type === 'RANKED_CHOICE') {
      const activeOptions = new Set(options.map((o) => o.id));
      const irvRounds: any[] = [];
      let winner = null;
      let round = 1;

      // Deep copy the votes as they will be modified
      const voterPreferences = closedPoll.votes.map((v) => (v.choices as string[]).filter(c => activeOptions.has(c)));

      while (activeOptions.size > 0 && !winner) {
        const counts: Record<string, number> = {};
        for (const optId of activeOptions) counts[optId] = 0;

        let totalActiveVotes = 0;

        // Count first preferences
        for (const prefs of voterPreferences) {
          if (prefs.length > 0) {
            counts[prefs[0]]++;
            totalActiveVotes++;
          }
        }

        // Check for winner
        let roundWinner = null;
        let minVotes = Infinity;
        let candidatesToEliminate: string[] = [];

        for (const optId of activeOptions) {
          const vCount = counts[optId];
          if (vCount > totalActiveVotes / 2) {
            roundWinner = optId;
          }
          if (vCount < minVotes) {
            minVotes = vCount;
            candidatesToEliminate = [optId];
          } else if (vCount === minVotes) {
            candidatesToEliminate.push(optId);
          }
        }

        if (roundWinner) {
          winner = roundWinner;
          irvRounds.push({
            round,
            counts,
            eliminated: [],
            winner
          });
          break;
        }

        // If everyone left has 0 votes
        if (minVotes === 0 && totalActiveVotes === 0) break;

        // Eliminate candidates
        irvRounds.push({
          round,
          counts,
          eliminated: candidatesToEliminate,
        });

        for (const elim of candidatesToEliminate) {
          activeOptions.delete(elim);
        }

        // Remove eliminated candidates from voters' lists
        for (let i = 0; i < voterPreferences.length; i++) {
          voterPreferences[i] = voterPreferences[i].filter(c => activeOptions.has(c));
        }

        round++;
      }

      return {
        poll_id: closedPoll.id,
        question: closedPoll.question,
        poll_type: closedPoll.poll_type,
        is_closed: closedPoll.is_closed,
        voting_deadline: closedPoll.voting_deadline,
        total_votes: closedPoll.votes.length,
        results: options.map((opt) => ({
          option_id: opt.id,
          option_text: opt.text,
          vote_count: irvRounds.length > 0 ? irvRounds[0].counts[opt.id] ?? 0 : 0,
        })),
        irv_rounds: irvRounds,
      };
    }

    // Standard counting for SINGLE_CHOICE and MULTIPLE_CHOICE
    const counts: Record<string, number> = {};
    for (const opt of options) {
      counts[opt.id] = 0;
    }

    for (const vote of closedPoll.votes) {
      const choices = vote.choices as string[];
      for (const choice of choices) {
        if (counts[choice] !== undefined) {
          counts[choice]++;
        }
      }
    }

    const results = options.map((opt) => ({
      option_id: opt.id,
      option_text: opt.text,
      vote_count: counts[opt.id] ?? 0,
    }));

    return {
      poll_id: closedPoll.id,
      question: closedPoll.question,
      poll_type: closedPoll.poll_type,
      is_closed: closedPoll.is_closed,
      voting_deadline: closedPoll.voting_deadline,
      total_votes: closedPoll.votes.length,
      results,
    };
  }

  /** Closes the poll if the voting deadline has passed. Returns the (possibly updated) poll. */
  async closeExpiredPoll(poll: Poll & { votes?: any[] }): Promise<Poll & { votes: any[] }> {
    if (!poll.is_closed && new Date() > poll.voting_deadline) {
      const updated = await this.prisma.poll.update({
        where: { id: poll.id },
        data: { is_closed: true },
        include: { votes: true },
      });
      return updated;
    }
    // Ensure votes array is present
    if (!('votes' in poll) || poll.votes === undefined) {
      return this.prisma.poll.findUnique({
        where: { id: poll.id },
        include: { votes: true },
      }) as Promise<Poll & { votes: any[] }>;
    }
    return poll as Poll & { votes: any[] };
  }
}
