import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '+251912345678', description: 'Ethiopian phone number in +251XXXXXXXXX format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+251[0-9]{9}$/, {
    message: 'Phone number must follow Ethiopian format (+251XXXXXXXXX)',
  })
  phone: string;

  @ApiProperty({ example: 'Password1', description: 'Min 8 chars, must include uppercase, lowercase, and digit' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  password: string;

  @ApiProperty({ example: 'Abebe Kebede', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'abebe@example.com', description: 'Optional email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiPropertyOptional({ example: 'Mahber member from Addis Ababa', description: 'Short bio' })
  @IsOptional()
  @IsString()
  bio?: string;
}
