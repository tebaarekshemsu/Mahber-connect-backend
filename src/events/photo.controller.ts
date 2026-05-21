import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PhotoService } from './photo.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function imageFileFilter(
  _req: any,
  file: any,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only JPEG and PNG images are allowed'), false);
  }
}

@ApiTags('Events - Photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/events/:eventId/photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  @ApiOperation({ summary: 'Upload photos to event gallery (batch)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Photos uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE, files: 10 },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadPhotos(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFiles() files: any[],
    @Body() dto: UploadPhotoDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.photoService.uploadPhotos(mahberId, eventId, user.sub, files, dto.caption);
  }

  @Get()
  @ApiOperation({ summary: 'Get all photos for an event' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 20 })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  findAll(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.photoService.findAll(
      mahberId,
      eventId,
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(100, parseInt(limit, 10) || 20),
    );
  }

  @Delete(':photoId')
  @ApiOperation({ summary: 'Delete a photo (uploader or admin only)' })
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiParam({ name: 'photoId', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this photo' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  deletePhoto(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.photoService.deletePhoto(mahberId, eventId, photoId, user.sub);
  }
}
