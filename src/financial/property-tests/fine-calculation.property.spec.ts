/**
 * Feature: mahber-connect-backend, Property 7: Fine Calculation Determinism
 *
 * Validates: Requirements 8.1, 8.3
 */
import * as fc from 'fast-check';
import { Prisma } from '@prisma/client';
import { FineService } from '../fine.service';

describe('Property 7: Fine Calculation Determinism', () => {
  let service: FineService;

  beforeEach(() => {
    // Only testing calculateFine which has no DB dependency
    service = new FineService(null as any, null as any);
  });

  it('should return the same result for the same inputs (percentage mode)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 1, max: 10000, noNaN: true }),
        (penaltyRate, contributionAmount) => {
          const result1 = service.calculateFine(penaltyRate, contributionAmount, 'percentage');
          const result2 = service.calculateFine(penaltyRate, contributionAmount, 'percentage');
          expect(result1.equals(result2)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return the same result for the same inputs (fixed mode)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 1, max: 10000, noNaN: true }),
        (penaltyRate, contributionAmount) => {
          const result1 = service.calculateFine(penaltyRate, contributionAmount, 'fixed');
          const result2 = service.calculateFine(penaltyRate, contributionAmount, 'fixed');
          expect(result1.equals(result2)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should compute percentage mode as contributionAmount * penaltyRate / 100', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 1, max: 10000, noNaN: true }),
        (penaltyRate, contributionAmount) => {
          const result = service.calculateFine(penaltyRate, contributionAmount, 'percentage');
          const expected = new Prisma.Decimal(contributionAmount)
            .mul(new Prisma.Decimal(penaltyRate))
            .div(new Prisma.Decimal(100));
          expect(result.equals(expected)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return penaltyRate directly in fixed mode', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.float({ min: 1, max: 10000, noNaN: true }),
        (penaltyRate, contributionAmount) => {
          const result = service.calculateFine(penaltyRate, contributionAmount, 'fixed');
          expect(result.equals(new Prisma.Decimal(penaltyRate))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
