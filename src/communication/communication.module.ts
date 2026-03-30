import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { RoleGuard } from '../membership/guards/role.guard';

@Module({
  controllers: [AnnouncementController, ChatController],
  providers: [AnnouncementService, ChatService, RoleGuard],
  exports: [AnnouncementService, ChatService],
})
export class CommunicationModule {}
