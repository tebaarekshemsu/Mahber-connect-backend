import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates Ethiopian phone numbers in +251XXXXXXXXX format.
 * The number must start with +251 followed by exactly 9 digits.
 */
@ValidatorConstraint({ name: 'isEthiopianPhone', async: false })
export class IsEthiopianPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: unknown, _args: ValidationArguments): boolean {
    if (typeof phone !== 'string') return false;
    return /^\+251[0-9]{9}$/.test(phone);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Phone number must follow Ethiopian format (+251XXXXXXXXX)';
  }
}

/**
 * Decorator that validates an Ethiopian phone number (+251XXXXXXXXX).
 */
export function IsEthiopianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEthiopianPhoneConstraint,
    });
  };
}
