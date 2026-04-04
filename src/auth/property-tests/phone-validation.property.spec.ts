/**
 * Feature: mahber-connect-backend, Property 11: Phone Number Format Validation
 *
 * Validates: Requirements 1.3
 */
import * as fc from 'fast-check';
import { IsEthiopianPhoneConstraint } from '../../common/validators/ethiopian-phone.validator';

const ETHIOPIAN_PHONE_REGEX = /^\+251[0-9]{9}$/;

describe('Property 11: Phone Number Format Validation', () => {
  let validator: IsEthiopianPhoneConstraint;

  beforeEach(() => {
    validator = new IsEthiopianPhoneConstraint();
  });

  it('should accept any string matching /^\\+251[0-9]{9}$/', () => {
    const validPhone = fc.tuple(
      fc.constant('+251'),
      fc.stringOf(
        fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
        { minLength: 9, maxLength: 9 },
      ),
    ).map(([prefix, digits]) => `${prefix}${digits}`);

    fc.assert(
      fc.property(validPhone, (phone) => {
        expect(validator.validate(phone, null as any)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject any arbitrary string that does not match the Ethiopian phone format', () => {
    // Filter out strings that accidentally match the regex
    const invalidPhone = fc.string().filter((s) => !ETHIOPIAN_PHONE_REGEX.test(s));

    fc.assert(
      fc.property(invalidPhone, (phone) => {
        expect(validator.validate(phone, null as any)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('should reject non-string values', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
        (value) => {
          expect(validator.validate(value, null as any)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
