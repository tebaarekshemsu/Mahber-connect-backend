import * as fc from 'fast-check';
import { MembershipStatus } from '@prisma/client';

/**
 * Generates valid Ethiopian phone numbers matching /^\+251[0-9]{9}$/
 */
export function validEthiopianPhone(): fc.Arbitrary<string> {
  return fc
    .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
      minLength: 9,
      maxLength: 9,
    })
    .map((digits) => `+251${digits}`);
}

/**
 * Generates valid Mahber configuration objects.
 */
export function validConfiguration(): fc.Arbitrary<object> {
  return fc.record({
    contribution_amount: fc.float({ min: 1, max: 10000, noNaN: true }),
    payment_frequency: fc.constantFrom('Weekly', 'Monthly', 'Quarterly'),
    penalty_rate: fc.float({ min: 0, max: 100, noNaN: true }),
    penalty_calculation_mode: fc.constantFrom('percentage', 'fixed'),
  });
}

/**
 * Generates valid MembershipStatus enum values.
 */
export function validMembershipStatus(): fc.Arbitrary<MembershipStatus> {
  return fc.constantFrom(...Object.values(MembershipStatus));
}
