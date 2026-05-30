import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMahberStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  is_suspended: boolean;
}

export class UpdateUserStatusDto {
  @IsNotEmpty()
  @IsBoolean()
  is_suspended: boolean;
}

export class PromoteUserDto {
  @IsNotEmpty()
  @IsBoolean()
  is_super_admin: boolean;
}

export class SuperAdminQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;
}
