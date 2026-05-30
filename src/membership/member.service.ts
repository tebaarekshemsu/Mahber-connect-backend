import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StateMachineService } from './state-machine.service';
import { SuspendMemberDto } from './dto/suspend-member.dto';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: StateMachineService,
  ) {}

  async findAll(mahberId: string, userId: string, page: number = 1, limit: number = 20) {
    await this.assertMember(mahberId, userId);

    const skip = (page - 1) * limit;
    const [members, total] = await Promise.all([
      this.prisma.membership.findMany({
        where: { mahber_id: mahberId },
        include: {
          user: { select: { id: true, name: true, phone: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.membership.count({ where: { mahber_id: mahberId } }),
    ]);

    return {
      data: members,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(mahberId: string, memberId: string, userId: string) {
    await this.assertMember(mahberId, userId);

    const membership = await this.prisma.membership.findFirst({
      where: { member_id: memberId, mahber_id: mahberId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return membership;
  }

  async suspend(mahberId: string, memberId: string, actorId: string, dto: SuspendMemberDto) {
    await this.assertAdmin(mahberId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { member_id: memberId, mahber_id: mahberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    const suspended_until = dto.duration_days
      ? new Date(Date.now() + dto.duration_days * 24 * 60 * 60 * 1000)
      : null;
    const suspension_reason = dto.reason || 'Suspended by admin';

    return this.stateMachine.transitionState(
      membership.id,
      MembershipStatus.Suspended,
      actorId,
      suspension_reason,
      this.prisma as any,
      {
        suspended_until,
        suspension_reason,
      },
    );
  }

  async checkAndReinstateExpiredSuspensions() {
    const now = new Date();
    const expiredMemberships = await this.prisma.membership.findMany({
      where: {
        status: MembershipStatus.Suspended,
        suspended_until: {
          lte: now,
        },
      },
    });

    const results: { id: string; memberId: string; success: boolean; error?: string }[] = [];
    for (const membership of expiredMemberships) {
      try {
        await this.stateMachine.transitionState(
          membership.id,
          MembershipStatus.Active,
          null,
          'Temporary suspension duration expired. Automatically reinstated by system.',
          this.prisma as any,
        );
        results.push({ id: membership.id, memberId: membership.member_id, success: true });
      } catch (err: any) {
        results.push({ id: membership.id, memberId: membership.member_id, success: false, error: err.message });
      }
    }
    return results;
  }

  async reinstate(mahberId: string, memberId: string, actorId: string) {
    await this.assertAdmin(mahberId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { member_id: memberId, mahber_id: mahberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return this.stateMachine.transitionState(
      membership.id,
      MembershipStatus.Active,
      actorId,
      'Reinstated by admin',
      this.prisma as any,
    );
  }

  async unban(mahberId: string, memberId: string, actorId: string) {
    await this.assertAdmin(mahberId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { member_id: memberId, mahber_id: mahberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return this.stateMachine.transitionState(
      membership.id,
      MembershipStatus.Active,
      actorId,
      'Unbanned by admin',
      this.prisma as any,
    );
  }


  private async assertMember(mahberId: string, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { mahber_id: mahberId, member_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
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
