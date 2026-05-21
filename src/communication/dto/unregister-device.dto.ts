import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnregisterDeviceDto {
  @ApiProperty({
    example: 'fcm-token-abc123',
    description: 'The FCM/Device token to unregister',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    required: false,
    description: 'User ID (optional, defaults to the authenticated user from JWT)',
  })
  @IsString()
  @IsOptional()
  userId?: string;
}
