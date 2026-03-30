import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AnnouncementPriority } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(AnnouncementPriority)
  priority: AnnouncementPriority;

  @IsString()
  @IsOptional()
  target_audience?: string;

  @IsDateString()
  @IsOptional()
  scheduled_at?: string;
}
