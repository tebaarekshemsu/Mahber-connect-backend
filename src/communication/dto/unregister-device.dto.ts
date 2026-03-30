import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnregisterDeviceDto {
  @ApiProperty({ example: 'fcm-token-abc123' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
