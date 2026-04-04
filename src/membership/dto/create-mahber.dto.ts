import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MahberType } from '@prisma/client';

export class CreateMahberDto {
  @ApiProperty({ example: 'Addis Mahber', description: 'Name of the Mahber group' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: MahberType, description: 'Type of the Mahber group' })
  @IsEnum(MahberType)
  type: MahberType;

  @ApiProperty({ example: { contribution_amount: 500, cycle: 'monthly' }, description: 'Mahber configuration settings' })
  @IsObject()
  configuration: Record<string, unknown>;

  @ApiPropertyOptional({ example: true, description: 'Whether the Mahber is publicly visible', default: true })
  @IsBoolean()
  @IsOptional()
  is_public?: boolean = true;

  @ApiPropertyOptional({ example: 'INV-ABC123', description: 'Invitation code for private Mahbers' })
  @IsString()
  @IsOptional()
  invitation_code?: string;
}
