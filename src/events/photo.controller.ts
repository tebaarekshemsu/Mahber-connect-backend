import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PhotoService, UPLOAD_CONFIG } from './photo.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';

function imageFileFilter(
  _req: any,
  file: any,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
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
  constructor(private readonly photoService: PhotoService) { }

  @Post()
  @ApiOperation({ summary: 'Upload a photo to event gallery' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Mahber ID' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 201, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, _file: any, cb: any) => {
          const mahberId = req.params?.id ?? 'unknown';
          const eventId = req.params?.eventId ?? 'unknown';
          const dir = path.join(UPLOAD_CONFIG.UPLOAD_DIR, mahberId, eventId);
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          cb(null, `${unique}${ext}`);
        },
      }),
      limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE },
      fileFilter: imageFileFilter,
    }),
  )
  async uploadPhoto(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: any,
    @Body() dto: UploadPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.photoService.uploadPhoto(
      mahberId,
      eventId,
      user.sub,
      file,
      dto.caption,
    );
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
