import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventType, EventRecurrence } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(EventType)
  event_type: EventType;

  @IsDateString()
  start_time: string;

  @IsDateString()
  end_time: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsBoolean()
  @IsOptional()
  is_mandatory?: boolean;

  @IsString()
  @IsOptional()
  host_id?: string;

  @IsEnum(EventRecurrence)
  @IsOptional()
  recurrence_pattern?: EventRecurrence;

  @IsDateString()
  @IsOptional()
  recurrence_end_date?: string;
}
