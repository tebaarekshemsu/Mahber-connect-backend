import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+251[0-9]{9}$/, {
    message: 'Phone number must follow Ethiopian format (+251XXXXXXXXX)',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
