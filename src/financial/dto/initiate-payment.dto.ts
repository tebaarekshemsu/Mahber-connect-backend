import {
  IsOptional,
  IsArray,
  IsString,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fine_ids?: string[];
}
