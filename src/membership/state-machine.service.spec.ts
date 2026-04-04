import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { StateMachineService } from './state-machine.service';
import { AuditService } from '../audit/audit.service';

const mockAudit = {
  logAuditEvent: jest.fn(),
};

describe('StateMachineService', () => {
  let service: StateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateMachineService,
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<StateMachineService>(StateMachineService);
    jest.clearAllMocks();
  });

  describe('validateTransition', () => {
    it('returns true for valid transition Pending → Approved', () => {
      expect(
        service.validateTransition(MembershipStatus.Pending, MembershipStatus.Approved),
      ).toBe(true);
    });

    it('returns true for valid transition Active → Suspended', () => {
      expect(
        service.validateTransition(MembershipStatus.Active, MembershipStatus.Suspended),
      ).toBe(true);
    });

    it('returns false for invalid transition Rejected → Active', () => {
      expect(
        service.validateTransition(MembershipStatus.Rejected, MembershipStatus.Active),
      ).toBe(false);
    });

    it('returns false for invalid transition Active → Pending', () => {
      expect(
        service.validateTransition(MembershipStatus.Active, MembershipStatus.Pending),
      ).toBe(false);
    });
  });

  describe('transitionState', () => {
    const membershipId = 'mem-1';
    const actorId = 'actor-1';
    const membership = {
      id: membershipId,
      mahber_id: 'mahber-1',
      status: MembershipStatus.Pending,
      activation_date: null,
      approval_date: null,
    };

    const mockPrismaClient = {
      membership: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    };

    it('updates status on valid transition', async () => {
      mockPrismaClient.membership.findUniqueOrThrow.mockResolvedValue(membership);
      mockPrismaClient.membership.update.mockResolvedValue({
        ...membership,
        status: MembershipStatus.Approved,
      });
      mockAudit.logAuditEvent.mockResolvedValue(undefined);

      const result = await service.transitionState(
        membershipId,
        MembershipStatus.Approved,
        actorId,
        'Approved by admin',
        mockPrismaClient as any,
      );

      expect(result.status).toBe(MembershipStatus.Approved);
      expect(mockPrismaClient.membership.update).toHaveBeenCalled();
    });

    it('throws BadRequestException on invalid transition', async () => {
      mockPrismaClient.membership.findUniqueOrThrow.mockResolvedValue({
        ...membership,
        status: MembershipStatus.Rejected,
      });

      await expect(
        service.transitionState(
          membershipId,
          MembershipStatus.Active,
          actorId,
          'invalid',
          mockPrismaClient as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
