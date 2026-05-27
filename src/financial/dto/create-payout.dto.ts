import { IsNumber, IsString, IsNotEmpty, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PayoutCategory } from '@prisma/client';

export class CreatePayoutDto {
  @ApiProperty({ example: 'usr_123', description: 'Member ID to receive the payout' })
  @IsString()
  @IsNotEmpty()
  member_id: string;

  @ApiProperty({ example: 1500.00, description: 'Amount to pay out (ETB)' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PayoutCategory, example: 'Iddir_Benefit', description: 'Category of the payout' })
  @IsEnum(PayoutCategory)
  category: PayoutCategory;

  @ApiProperty({ example: 'Bereavement support for member family', description: 'Reason for the payout' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
