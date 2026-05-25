import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PollService } from './poll.service';
import { PollController } from './poll.controller';
import { FirebaseService } from './firebase.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { RoleGuard } from '../membership/guards/role.guard';
import { CommunicationGateway } from './communication.gateway';

@Module({
  controllers: [AnnouncementController, ChatController, PollController, NotificationController],
  providers: [AnnouncementService, ChatService, PollService, FirebaseService, EmailService, SmsService, NotificationService, RoleGuard, CommunicationGateway],
  exports: [AnnouncementService, ChatService, PollService, FirebaseService, EmailService, SmsService, NotificationService],
})
export class CommunicationModule {}
