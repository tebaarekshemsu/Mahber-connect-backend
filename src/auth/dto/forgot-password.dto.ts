import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: '+251912345678', description: 'Registered Ethiopian phone number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+251[0-9]{9}$/, {
    message: 'Phone number must follow Ethiopian format (+251XXXXXXXXX)',
  })
  phone: string;
}
