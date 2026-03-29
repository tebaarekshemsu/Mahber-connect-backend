import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { DEFAULT_ROLES } from '../rbac/roles';

const VALID_ROLE_NAMES = [...Object.keys(DEFAULT_ROLES), 'custom'];

export class AssignRoleDto {
  @IsString()
  @IsIn(VALID_ROLE_NAMES, {
    message: `role_name must be one of: ${VALID_ROLE_NAMES.join(', ')}`,
  })
  role_name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  custom_permissions?: string[];
}
