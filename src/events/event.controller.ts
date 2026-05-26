import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MembershipStatus } from '@prisma/client';
import * as QRCode from 'qrcode';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EventService } from './event.service';
import { QrService } from './qr.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SendInvitationsDto } from './dto/send-invitations.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';

@ApiTags('Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly qrService: QrService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventService.create(mahberId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events for a mahber' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll(@Param('id') mahberId: string, @Query('page') page = '1', @Query('limit') limit = '20') {
    return this.eventService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  @Get(':eventId')
  @ApiOperation({ summary: 'Get event details' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    return this.eventService.findOne(mahberId, eventId);
  }

  @Get(':eventId/user-qr')
  @ApiOperation({ summary: 'Generate personal QR code for current user' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  @ApiResponse({ status: 404, description: 'Event or membership not found' })
  async getUserQr(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const event = await this.eventService.findOne(mahberId, eventId);
    const membership = await this.prisma.membership.findFirst({
      where: {
        member_id: user.sub,
        mahber_id: mahberId,
        status: MembershipStatus.Active,
      },
    });
    if (!membership) {
      throw new NotFoundException('User is not a member of this mahber');
    }
    const expSeconds = Math.floor(event.end_time.getTime() / 1000) + 30 * 60;
    const payload = {
      event_id: event.id,
      mahber_id: event.mahber_id,
      member_id: user.sub,
      exp: expSeconds,
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.secret'),
    });
    const dataUrl = await QRCode.toDataURL(token);
    return { qr_code: dataUrl };
  }

  @Put(':eventId')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Update an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventService.update(mahberId, eventId, user.sub, dto);
  }

  @Delete(':eventId')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Cancel an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  cancel(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventService.cancel(mahberId, eventId, user.sub);
  }

  @Post(':eventId/invitations')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Send event invitations to specific members' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Invitations sent successfully' })
  @ApiResponse({ status: 409, description: 'All selected members already invited' })
  sendInvitations(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendInvitationsDto,
  ) {
    return this.eventService.sendInvitations(mahberId, eventId, user.sub, dto.member_ids);
  }

  @Get(':eventId/invitations')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Get all invitations for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Invitations retrieved successfully' })
  getInvitations(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    return this.eventService.getInvitationsForEvent(mahberId, eventId);
  }

  @Put(':eventId/invitations/:invId/respond')
  @ApiOperation({ summary: 'Respond to an event invitation (accept/decline)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'invId', description: 'Invitation ID' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  @ApiResponse({ status: 403, description: 'Invitation belongs to another member' })
  @ApiResponse({ status: 404, description: 'Invitation not found' })
  respondToInvitation(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @Param('invId') invId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RespondInvitationDto,
  ) {
    return this.eventService.respondToInvitation(mahberId, eventId, invId, user.sub, dto.action);
  }

  @Post(':eventId/register')
  @ApiOperation({ summary: 'Register (RSVP) for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Registered successfully' })
  @ApiResponse({ status: 409, description: 'Already registered' })
  @ApiResponse({ status: 400, description: 'Registration closed' })
  registerForEvent(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventService.registerForEvent(mahberId, eventId, user.sub);
  }

  @Delete(':eventId/register')
  @ApiOperation({ summary: 'Cancel registration for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Registration cancelled' })
  @ApiResponse({ status: 404, description: 'No active registration found' })
  cancelRegistration(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventService.cancelRegistration(mahberId, eventId, user.sub);
  }

  @Get(':eventId/registrations')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  @ApiOperation({ summary: 'Get registration summary for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Registrations retrieved' })
  getRegistrations(@Param('id') mahberId: string, @Param('eventId') eventId: string) {
    return this.eventService.getRegistrations(mahberId, eventId);
  }
}
