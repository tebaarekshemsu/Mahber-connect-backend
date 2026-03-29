import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { MahberType } from '@prisma/client';

export class UpdateMahberDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsEnum(MahberType)
  @IsOptional()
  type?: MahberType;

  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean;

  @IsString()
  @IsOptional()
  invitation_code?: string;
}
