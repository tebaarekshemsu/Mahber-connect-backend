import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MahberService } from './mahber.service';
import { CreateMahberDto } from './dto/create-mahber.dto';
import { UpdateMahberDto } from './dto/update-mahber.dto';

@UseGuards(JwtAuthGuard)
@Controller('mahbers')
export class MahberController {
  constructor(private readonly mahberService: MahberService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMahberDto) {
    return this.mahberService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.mahberService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mahberService.findOne(id, user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMahberDto,
  ) {
    return this.mahberService.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mahberService.remove(id, user.sub);
  }
}
