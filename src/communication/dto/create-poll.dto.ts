import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PollType } from '@prisma/client';

export class PollOptionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  text: string; // Supports Amharic
}

export class CreatePollDto {
  @IsString()
  @IsNotEmpty()
  question: string; // Supports Amharic

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @IsEnum(PollType)
  poll_type: PollType;

  @IsDateString()
  voting_deadline: string;

  @IsString()
  @IsOptional()
  eligibility_criteria?: string;
}
