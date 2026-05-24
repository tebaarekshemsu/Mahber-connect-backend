import { IsNumber, IsString, IsNotEmpty, IsEnum, Min } from 'class-validator';
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
}
