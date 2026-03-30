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
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('mahbers/:id/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventService.create(mahberId, user.sub, dto);
  }

  @Get()
  findAll(
    @Param('id') mahberId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.eventService.findAll(
      mahberId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  @Get(':eventId')
  findOne(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.findOne(mahberId, eventId);
  }

  @Put(':eventId')
  @RequirePermission(PERMISSIONS.CREATE_EVENTS)
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
  cancel(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.eventService.cancel(mahberId, eventId, user.sub);
  }
}
