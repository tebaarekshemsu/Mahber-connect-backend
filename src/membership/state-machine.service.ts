import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { MembershipStatus, PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

export const VALID_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  [MembershipStatus.Pending]: [
    MembershipStatus.Approved,
    MembershipStatus.Rejected,
    MembershipStatus.Invalidated,
  ],
  [MembershipStatus.Approved]: [MembershipStatus.Payment_Required],
  [MembershipStatus.Payment_Required]: [
    MembershipStatus.Active,
    MembershipStatus.Invalidated,
  ],
  [MembershipStatus.Active]: [MembershipStatus.Suspended],
  [MembershipStatus.Suspended]: [MembershipStatus.Active],
  [MembershipStatus.Rejected]: [],
  [MembershipStatus.Invalidated]: [],
};

@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);

  constructor(private readonly audit: AuditService) {}

  /**
   * Returns true if transitioning from `from` to `to` is a valid state transition.
   */
  validateTransition(from: MembershipStatus, to: MembershipStatus): boolean {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
  }

  /**
   * Transitions a membership to a new status, performing validation and audit logging.
   * AuditTrail model is not yet in schema — transitions are logged via Logger for now.
   */
  async transitionState(
    membershipId: string,
    to: MembershipStatus,
    actorId: string,
    reason: string,
    prisma: PrismaClient,
  ) {
    const membership = await prisma.membership.findUniqueOrThrow({
      where: { id: membershipId },
    });

    const from = membership.status;

    if (!this.validateTransition(from, to)) {
      throw new BadRequestException(
        `Invalid state transition: ${from} → ${to}`,
      );
    }

    this.validateStateRequirements(to, membership);

    const updateData: Record<string, unknown> = { status: to };

    if (to === MembershipStatus.Active && !membership.activation_date) {
      updateData.activation_date = new Date();
    }

    if (to === MembershipStatus.Approved && !membership.approval_date) {
      updateData.approval_date = new Date();
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: updateData,
    });

    // AuditTrail model is now in schema — log the transition
    this.logger.log(
      `Membership ${membershipId}: ${from} → ${to} by actor=${actorId}`,
    );

    await this.audit.logAuditEvent({
      mahber_id: membership.mahber_id,
      entity_type: 'membership',
      entity_id: membershipId,
      action: 'status_transition',
      actor_id: actorId,
      old_value: { status: from },
      new_value: { status: to },
      metadata: { reason },
    });

    return updated;
  }

  /**
   * Validates state-specific requirements before allowing a transition.
   * Throws BadRequestException if requirements are not met.
   */
  private validateStateRequirements(
    to: MembershipStatus,
    membership: { activation_date: Date | null },
  ): void {
    // Active state: activation_date will be set automatically if missing,
    // but if it's explicitly set to a future date that's invalid, we could check here.
    // For now, no blocking validation needed since we auto-set activation_date.
    void to;
    void membership;
  }
}
