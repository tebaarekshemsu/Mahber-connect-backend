import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { MahberType } from '@prisma/client';

export class CreateMahberDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(MahberType)
  type: MahberType;

  @IsObject()
  configuration: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  is_public?: boolean = true;

  @IsString()
  @IsOptional()
  invitation_code?: string;
}
