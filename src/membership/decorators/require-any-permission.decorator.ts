import { SetMetadata } from '@nestjs/common';
import { Permission } from '../rbac/permissions';

export const PERMISSIONS_ANY_KEY = 'required_permissions_any';

export const RequireAnyPermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
