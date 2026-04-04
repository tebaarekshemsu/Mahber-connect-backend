/**
 * Feature: mahber-connect-backend, Property 2: Membership State Machine Validity
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */
import * as fc from 'fast-check';
import { MembershipStatus } from '@prisma/client';
import {
  StateMachineService,
  VALID_TRANSITIONS,
} from '../state-machine.service';

describe('Property 2: Membership State Machine Validity', () => {
  let service: StateMachineService;

  beforeEach(() => {
    // StateMachineService requires AuditService; we only test validateTransition
    // which has no dependency on it, so we pass a minimal stub.
    service = new StateMachineService(null as any);
  });

  it('should accept a transition iff it is in the valid transitions set', () => {
    const allStatuses = Object.values(MembershipStatus);

    fc.assert(
      fc.property(
        fc.constantFrom(...allStatuses),
        fc.constantFrom(...allStatuses),
        (from: MembershipStatus, to: MembershipStatus) => {
          const result = service.validateTransition(from, to);
          const expected = (VALID_TRANSITIONS[from] ?? []).includes(to);
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
