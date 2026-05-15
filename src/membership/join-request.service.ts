import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JoinRequestStatus, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { ProcessJoinRequestDto } from './dto/process-join-request.dto';
import { BatchProcessJoinRequestDto } from './dto/batch-process-join-request.dto';

@Injectable()
export class JoinRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(mahberId: string, userId: string, dto: CreateJoinRequestDto) {
    const mahber = await this.prisma.mahber.findUnique({ where: { id: mahberId } });
    if (!mahber) {
      throw new NotFoundException('Organization not found');
    }

    // Validate invitation code for private organizations
    if (!mahber.is_public) {
      if (!dto.invitation_code) {
        throw new BadRequestException('Invitation code is required for private organizations');
      }
      if (mahber.invitation_code !== dto.invitation_code) {
        throw new BadRequestException('Invalid invitation code');
      }
    }

    // Prevent duplicate active join requests
    const existing = await this.prisma.joinRequest.findFirst({
      where: {
        mahber_id: mahberId,
        user_id: userId,
        status: { in: [JoinRequestStatus.Pending, JoinRequestStatus.Approved] },
      },
    });
    if (existing) {
      throw new ConflictException('You already have an active join request for this organization');
    }

    return this.prisma.joinRequest.create({
      data: {
        mahber_id: mahberId,
        user_id: userId,
        status: JoinRequestStatus.Pending,
        invitation_code: dto.invitation_code,
      },
    });
  }

  async findAll(mahberId: string, userId: string) {
    await this.assertAdmin(mahberId, userId);

    return this.prisma.joinRequest.findMany({
      where: { mahber_id: mahberId },
      include: { user: { select: { id: true, name: true, phone: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async processRequest(
    mahberId: string,
    requestId: string,
    actorId: string,
    dto: ProcessJoinRequestDto,
  ) {
    await this.assertAdmin(mahberId, actorId);

    const joinRequest = await this.prisma.joinRequest.findFirst({
      where: { id: requestId, mahber_id: mahberId },
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    if (joinRequest.status !== JoinRequestStatus.Pending) {
      throw new BadRequestException('Only pending join requests can be processed');
    }

    if (dto.action === 'reject') {
      return this.prisma.joinRequest.update({
        where: { id: requestId },
        data: {
          status: JoinRequestStatus.Rejected,
          rejection_reason: dto.rejection_reason,
        },
      });
    }

    // Approval flow: Pending → Approved, then create Membership with Payment_Required
    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: JoinRequestStatus.Approved },
      }),
      this.prisma.membership.create({
        data: {
          mahber_id: mahberId,
          member_id: joinRequest.user_id,
          status: MembershipStatus.Payment_Required,
          role: { name: 'Member', permissions: [] },
          approval_date: new Date(),
        },
      }),
    ]);

    return updatedRequest;
  }

  async batchProcess(mahberId: string, actorId: string, dto: BatchProcessJoinRequestDto) {
    await this.assertAdmin(mahberId, actorId);

    const requestIds = dto.requests.map((r) => r.requestId);
    const existingRequests = await this.prisma.joinRequest.findMany({
      where: { id: { in: requestIds }, mahber_id: mahberId },
    });

    const requestMap = new Map(existingRequests.map((r) => [r.id, r]));

    const results: { approved: number; rejected: number; failed: Array<{ requestId: string; reason: string }> } = {
      approved: 0,
      rejected: 0,
      failed: [],
    };

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.requests) {
        const request = requestMap.get(item.requestId);

        if (!request) {
          results.failed.push({ requestId: item.requestId, reason: 'Join request not found' });
          continue;
        }

        if (request.status !== JoinRequestStatus.Pending) {
          results.failed.push({
            requestId: item.requestId,
            reason: `Only pending join requests can be processed (current: ${request.status})`,
          });
          continue;
        }

        if (item.action === 'reject') {
          await tx.joinRequest.update({
            where: { id: item.requestId },
            data: {
              status: JoinRequestStatus.Rejected,
              rejection_reason: item.rejection_reason,
            },
          });
          results.rejected++;
        } else {
          await tx.joinRequest.update({
            where: { id: item.requestId },
            data: { status: JoinRequestStatus.Approved },
          });
          await tx.membership.create({
            data: {
              mahber_id: mahberId,
              member_id: request.user_id,
              status: MembershipStatus.Payment_Required,
              role: { name: 'Member', permissions: [] },
              approval_date: new Date(),
            },
          });
          results.approved++;
        }
      }
    });

    return results;
  }

  async invite(mahberId: string, adminId: string, phone: string) {
    await this.assertAdmin(mahberId, adminId);

    const invitedUser = await this.prisma.user.findUnique({ where: { phone } });
    if (!invitedUser) {
      throw new NotFoundException('User with this phone number not found');
    }

    const existingMember = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: invitedUser.id }
    });
    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const existing = await this.prisma.joinRequest.findFirst({
      where: {
        mahber_id: mahberId,
        user_id: invitedUser.id,
        status: { in: [JoinRequestStatus.Pending, JoinRequestStatus.Approved] },
      },
    });
    if (existing) {
      throw new ConflictException('An active join request or invitation already exists for this user');
    }

    return this.prisma.joinRequest.create({
      data: {
        mahber_id: mahberId,
        user_id: invitedUser.id,
        status: JoinRequestStatus.Pending,
        is_invitation: true,
      },
      include: { mahber: true }
    });
  }

  async getInvitationsForUser(userId: string) {
    return this.prisma.joinRequest.findMany({
      where: {
        user_id: userId,
        is_invitation: true,
        status: JoinRequestStatus.Pending,
      },
      include: {
        mahber: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async respondToInvitation(requestId: string, userId: string, action: 'accept' | 'reject') {
    const invitation = await this.prisma.joinRequest.findFirst({
      where: { id: requestId, user_id: userId, is_invitation: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== JoinRequestStatus.Pending) {
      throw new BadRequestException('Only pending invitations can be responded to');
    }

    if (action === 'reject') {
      return this.prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: JoinRequestStatus.Rejected },
      });
    }

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: JoinRequestStatus.Approved },
      }),
      this.prisma.membership.create({
        data: {
          mahber_id: invitation.mahber_id,
          member_id: userId,
          status: MembershipStatus.Payment_Required,
          role: { name: 'Member', permissions: [] },
          approval_date: new Date(),
        },
      }),
    ]);

    return updatedRequest;
  }

  private async assertAdmin(mahberId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const role = membership.role as { name: string; permissions: string[] };
    if (!role?.permissions?.includes('manage_members')) {
      throw new ForbiddenException('Admin role required');
    }
  }
}
