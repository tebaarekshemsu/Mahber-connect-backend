import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsEmail,
  IsString,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { PaymentType } from '@prisma/client';

export class InitiatePaymentDto {
  @IsEnum(PaymentType)
  payment_type: PaymentType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsUrl()
  callback_url?: string;

  @IsOptional()
  @IsUrl()
  return_url?: string;
}
