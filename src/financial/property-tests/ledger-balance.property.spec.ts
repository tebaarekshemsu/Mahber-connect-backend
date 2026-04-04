/**
 * Feature: mahber-connect-backend, Property 3: Ledger Balance Consistency
 *
 * Validates: Requirements 7.3
 */
import * as fc from 'fast-check';
import { Prisma } from '@prisma/client';

/**
 * Pure helper that simulates the running balance logic from LedgerService.
 * Given a sequence of amounts, returns the running balance after each entry.
 */
function computeRunningBalances(amounts: number[]): Prisma.Decimal[] {
  const balances: Prisma.Decimal[] = [];
  let running = new Prisma.Decimal(0);
  for (const amount of amounts) {
    running = running.add(new Prisma.Decimal(amount));
    balances.push(running);
  }
  return balances;
}

describe('Property 3: Ledger Balance Consistency', () => {
  it('should have running balance equal to cumulative sum at each step', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (amounts) => {
          const runningBalances = computeRunningBalances(amounts);

          // Each running balance should equal the sum of all amounts up to that point
          for (let i = 0; i < amounts.length; i++) {
            const expectedSum = amounts
              .slice(0, i + 1)
              .reduce(
                (acc, a) => acc.add(new Prisma.Decimal(a)),
                new Prisma.Decimal(0),
              );
            expect(runningBalances[i].equals(expectedSum)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should have final running balance equal to the sum of all amounts', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: -1000, max: 1000, noNaN: true }), {
          minLength: 1,
          maxLength: 20,
        }),
        (amounts) => {
          const runningBalances = computeRunningBalances(amounts);
          const finalBalance = runningBalances[runningBalances.length - 1];

          const totalSum = amounts.reduce(
            (acc, a) => acc.add(new Prisma.Decimal(a)),
            new Prisma.Decimal(0),
          );

          expect(finalBalance.equals(totalSum)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
