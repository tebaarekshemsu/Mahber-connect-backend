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
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PhotoService, UPLOAD_CONFIG } from './photo.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';

/**
 * Task 14.1: multer file filter — only JPEG and PNG.
 */
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

@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/events/:eventId/photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  /**
   * POST /mahbers/:id/events/:eventId/photos
   * Upload a photo to an event gallery.
   * Validates: Requirements 12.1, 12.2, 12.7
   *
   * Storage is configured dynamically per request using the mahberId/eventId
   * route params. The multer interceptor uses a storage engine that reads
   * params from the request object at runtime.
   */
  @Post()
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

  /**
   * GET /mahbers/:id/events/:eventId/photos
   * Paginated photo listing with multi-tenancy isolation.
   * Validates: Requirement 12.4
   */
  @Get()
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

  /**
   * DELETE /mahbers/:id/events/:eventId/photos/:photoId
   * Delete a photo — uploader or admin only.
   * Validates: Requirement 12.5
   */
  @Delete(':photoId')
  deletePhoto(
    @Param('id') mahberId: string,
    @Param('eventId') eventId: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.photoService.deletePhoto(mahberId, eventId, photoId, user.sub);
  }
}
