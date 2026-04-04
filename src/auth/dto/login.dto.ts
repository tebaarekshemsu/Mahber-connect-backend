import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+251912345678', description: 'Ethiopian phone number in +251XXXXXXXXX format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+251[0-9]{9}$/, {
    message: 'Phone number must follow Ethiopian format (+251XXXXXXXXX)',
  })
  phone: string;

  @ApiProperty({ example: 'Password1', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
