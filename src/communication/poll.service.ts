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

@Injectable()
export class PollService {
  constructor(private readonly prisma: PrismaService) {}

  async create(mahberId: string, actorId: string, dto: CreatePollDto) {
    return this.prisma.poll.create({
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
  }

  async findAll(mahberId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        where: { mahber_id: mahberId },
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

    // Aggregate vote counts per option — no individual vote exposure
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
