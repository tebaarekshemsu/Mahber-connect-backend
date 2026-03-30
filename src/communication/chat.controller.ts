import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/chat/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  sendMessage(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(mahberId, user.sub, dto);
  }

  @Get()
  findAll(
    @Param('id') mahberId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.chatService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  @Put(':messageId')
  editMessage(
    @Param('id') mahberId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(mahberId, messageId, user.sub, dto);
  }

  @Delete(':messageId')
  deleteMessage(
    @Param('id') mahberId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.deleteMessage(mahberId, messageId, user.sub);
  }
}
