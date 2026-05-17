import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StateMachineService } from './state-machine.service';

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

  async suspend(mahberId: string, memberId: string, actorId: string) {
    await this.assertAdmin(mahberId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { id: memberId, mahber_id: mahberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return this.stateMachine.transitionState(
      memberId,
      MembershipStatus.Suspended,
      actorId,
      'Suspended by admin',
      this.prisma as any,
    );
  }

  async reinstate(mahberId: string, memberId: string, actorId: string) {
    await this.assertAdmin(mahberId, actorId);

    const membership = await this.prisma.membership.findFirst({
      where: { id: memberId, mahber_id: mahberId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    return this.stateMachine.transitionState(
      memberId,
      MembershipStatus.Active,
      actorId,
      'Reinstated by admin',
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
