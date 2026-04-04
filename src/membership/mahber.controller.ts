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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MahberService } from './mahber.service';
import { CreateMahberDto } from './dto/create-mahber.dto';
import { UpdateMahberDto } from './dto/update-mahber.dto';

@ApiTags('Membership')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers')
export class MahberController {
  constructor(private readonly mahberService: MahberService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Mahber group' })
  @ApiResponse({ status: 201, description: 'Mahber created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMahberDto) {
    return this.mahberService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Mahbers for the current user' })
  @ApiResponse({ status: 200, description: 'Returns list of Mahbers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.mahberService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Mahber by ID' })
  @ApiResponse({ status: 200, description: 'Returns the Mahber' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Mahber not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mahberService.findOne(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a Mahber' })
  @ApiResponse({ status: 200, description: 'Mahber updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Mahber not found' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMahberDto,
  ) {
    return this.mahberService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Mahber' })
  @ApiResponse({ status: 200, description: 'Mahber deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Mahber not found' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.mahberService.remove(id, user.sub);
  }
}
