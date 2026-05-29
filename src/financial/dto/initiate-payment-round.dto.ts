import { IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentRoundDto {
  @ApiPropertyOptional({
    description: 'Due date for the payment round (ISO string). Defaults to now if not provided.',
    example: '2026-06-10T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  due_date?: string;
}
