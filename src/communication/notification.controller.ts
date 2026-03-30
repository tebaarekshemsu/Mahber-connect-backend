import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UnregisterDeviceDto } from './dto/unregister-device.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('register-device')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register a device token for push notifications' })
  async registerDevice(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterDeviceDto,
  ): Promise<void> {
    await this.notificationService.registerDevice(user.userId, dto.token, dto.platform);
  }

  @Delete('unregister-device')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device token' })
  async unregisterDevice(
    @CurrentUser() user: { userId: string },
    @Body() dto: UnregisterDeviceDto,
  ): Promise<void> {
    await this.notificationService.unregisterDevice(user.userId, dto.token);
  }
}
