import { IsNumber, IsString, IsNotEmpty, IsEnum, IsOptional, Min, IsIn } from 'class-validator';
import { ExpenseCategory } from '@prisma/client';

export class CreateExpenseDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  recipient_name: string;

  @IsString()
  @IsIn(['bank', 'telebirr'])
  recipient_account_type: string;

  @IsString()
  @IsNotEmpty()
  recipient_account: string;

  @IsString()
  @IsOptional()
  recipient_bank_code?: string;
}
