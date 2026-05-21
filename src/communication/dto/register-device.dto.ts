import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({
    example: 'fcm-token-abc123',
    description: 'The FCM/Device token from the client',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    enum: ['ios', 'android', 'web'],
    description: 'The device platform',
  })
  @IsIn(['ios', 'android', 'web'])
  platform: string;

  @ApiProperty({
    required: false,
    description: 'User ID (optional, defaults to the authenticated user from JWT)',
  })
  @IsString()
  @IsOptional()
  userId?: string;
}
