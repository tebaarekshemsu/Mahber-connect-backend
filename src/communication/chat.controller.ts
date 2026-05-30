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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';

@ApiTags('Communication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/chat/messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  @ApiOperation({ summary: 'Send a new chat message' })
  sendMessage(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(mahberId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get chat messages with read receipt info' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.chatService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
      user.sub,
    );
  }

  @Put(':messageId')
  @ApiOperation({ summary: 'Edit a chat message' })
  editMessage(
    @Param('id') mahberId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: EditMessageDto,
  ) {
    return this.chatService.editMessage(mahberId, messageId, user.sub, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a chat message' })
  deleteMessage(
    @Param('id') mahberId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.deleteMessage(mahberId, messageId, user.sub);
  }

  // ── Read Receipts ──────────────────────────────────────────────────────────

  @Post('read')
  @ApiOperation({ summary: 'Mark messages as read (bulk)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiResponse({ status: 201, description: 'Messages marked as read' })
  markMessagesRead(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkMessagesReadDto,
  ) {
    return this.chatService.markMessagesRead(mahberId, user.sub, dto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count for the current user' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  getUnreadCount(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.getUnreadCount(mahberId, user.sub);
  }

  @Get(':messageId/read-receipts')
  @ApiOperation({ summary: 'Get read receipts for a specific message' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'messageId', description: 'Chat message ID' })
  @ApiResponse({ status: 200, description: 'Read receipts retrieved' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  getReadReceipts(
    @Param('id') mahberId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.getReadReceipts(mahberId, messageId);
  }
}
