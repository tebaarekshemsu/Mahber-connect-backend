import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

// Task 14.1: File upload configuration constants
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png'],
  UPLOAD_DIR: './uploads/photos',
  THUMBNAIL_DIR: './uploads/thumbnails',
  THUMBNAIL_SIZE: 300,
  STORAGE_QUOTA: 1000, // max photos per org
};

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Task 14.2: Generate a 300x300 thumbnail using sharp.
   * Validates: Requirement 12.3
   */
  async generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
    // Dynamic import so sharp is optional at module load time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp');
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(inputPath)
      .resize(UPLOAD_CONFIG.THUMBNAIL_SIZE, UPLOAD_CONFIG.THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .toFile(outputPath);
  }

  /**
   * Task 14.5: Check storage quota — reject if org already has >= 1000 photos.
   * Validates: Requirement 12.6
   */
  async checkStorageQuota(mahberId: string): Promise<void> {
    const count = await this.prisma.eventPhoto.count({
      where: { mahber_id: mahberId },
    });
    if (count >= UPLOAD_CONFIG.STORAGE_QUOTA) {
      throw new BadRequestException(
        `Storage quota exceeded: organisation has reached the maximum of ${UPLOAD_CONFIG.STORAGE_QUOTA} photos`,
      );
    }
  }

  /**
   * Task 14.3: Validate, store file, generate thumbnail, persist metadata.
   * Validates: Requirements 12.1, 12.2, 12.7
   */
  async uploadPhoto(
    mahberId: string,
    eventId: string,
    uploaderId: string,
    file: any,
    caption?: string,
  ) {
    // 14.1 — validate file type
    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG and PNG images are allowed',
      );
    }

    // 14.1 — validate file size (multer limit handles this too, but double-check)
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds the 10MB limit');
    }

    // Verify event belongs to mahber
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // 14.5 — quota check
    await this.checkStorageQuota(mahberId);

    // Persist file to disk (multer already wrote it; file.path is the destination)
    const filePath = file.path;

    // 14.2 — generate thumbnail
    const ext = path.extname(file.originalname) || '.jpg';
    const thumbFilename = `${path.basename(filePath, path.extname(filePath))}_thumb${ext}`;
    const thumbDir = path.join(
      UPLOAD_CONFIG.THUMBNAIL_DIR,
      mahberId,
      eventId,
    );
    const thumbnailPath = path.join(thumbDir, thumbFilename);

    let resolvedThumbnailPath: string | null = null;
    try {
      await this.generateThumbnail(filePath, thumbnailPath);
      resolvedThumbnailPath = thumbnailPath;
    } catch (err) {
      this.logger.warn(`Thumbnail generation failed for ${filePath}: ${err}`);
    }

    // 12.2 — store metadata
    const photo = await this.prisma.eventPhoto.create({
      data: {
        event_id: eventId,
        mahber_id: mahberId,
        uploader_id: uploaderId,
        file_path: filePath,
        thumbnail_path: resolvedThumbnailPath,
        caption: caption ?? null,
      },
    });

    this.logger.log(
      `Photo uploaded: id=${photo.id} event=${eventId} mahber=${mahberId} uploader=${uploaderId}`,
    );

    return photo;
  }

  /**
   * Task 14.4: Paginated photo listing with multi-tenancy isolation.
   * Validates: Requirement 12.4
   */
  async findAll(
    mahberId: string,
    eventId: string,
    page: number,
    limit: number,
  ) {
    // Verify event belongs to mahber
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.eventPhoto.findMany({
        where: { event_id: eventId, mahber_id: mahberId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.eventPhoto.count({
        where: { event_id: eventId, mahber_id: mahberId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Task 14.4: Delete a photo — only uploader or admin may delete.
   * Validates: Requirement 12.5
   */
  async deletePhoto(
    mahberId: string,
    eventId: string,
    photoId: string,
    actorId: string,
  ) {
    const photo = await this.prisma.eventPhoto.findFirst({
      where: { id: photoId, event_id: eventId, mahber_id: mahberId },
    });

    if (!photo) {
      throw new NotFoundException(`Photo ${photoId} not found`);
    }

    // Check if actor is the uploader
    const isUploader = photo.uploader_id === actorId;

    // Check if actor is an admin of this mahber
    const membership = await this.prisma.membership.findFirst({
      where: { member_id: actorId, mahber_id: mahberId, status: 'Active' },
    });

    const role = membership?.role as { permissions?: string[] } | null;
    const isAdmin = role?.permissions?.includes('manage_members') ?? false;

    if (!isUploader && !isAdmin) {
      throw new ForbiddenException(
        'Only the photo uploader or an admin can delete this photo',
      );
    }

    await this.prisma.eventPhoto.delete({ where: { id: photoId } });

    // Best-effort cleanup of files
    try {
      if (fs.existsSync(photo.file_path)) {
        fs.unlinkSync(photo.file_path);
      }
      if (photo.thumbnail_path && fs.existsSync(photo.thumbnail_path)) {
        fs.unlinkSync(photo.thumbnail_path);
      }
    } catch (err) {
      this.logger.warn(`File cleanup failed for photo ${photoId}: ${err}`);
    }

    this.logger.log(
      `Photo deleted: id=${photoId} event=${eventId} mahber=${mahberId} actor=${actorId}`,
    );

    return { message: 'Photo deleted successfully' };
  }
}
