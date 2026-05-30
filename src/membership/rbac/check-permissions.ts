import { Permission } from './permissions';

export function membershipHasRequiredPermissions(
  memberPermissions: Permission[],
  required?: Permission,
  requiredAny?: Permission[],
): boolean {
  if (requiredAny?.length) {
    return requiredAny.some((p) => memberPermissions.includes(p));
  }
  if (required) {
    return memberPermissions.includes(required);
  }
  return true;
}
