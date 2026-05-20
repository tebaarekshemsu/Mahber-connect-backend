import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_QUOTA = 1000;

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);
  private cloudinary;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
    this.cloudinary = cloudinary;
  }

  private uploadBufferToCloudinary(buffer: Buffer, options: Record<string, any>) {
    return new Promise<any>((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(options, (error: any, result: any) => {
        if (error) {
          return reject(error);
        }
        if (!result) {
          return reject(new Error('Cloudinary upload failed without a response'));
        }
        return resolve(result);
      });

      uploadStream.end(buffer);
    });
  }

  /**
   * Task 14.5: Check storage quota — reject if org already has >= 1000 photos.
   * Validates: Requirement 12.6
   */
  async checkStorageQuota(mahberId: string, incomingCount = 1): Promise<void> {
    const count = await this.prisma.eventPhoto.count({
      where: { mahber_id: mahberId },
    });
    if (count + incomingCount > STORAGE_QUOTA) {
      throw new BadRequestException(
        `Storage quota exceeded: organisation has reached the maximum of ${STORAGE_QUOTA} photos`,
      );
    }
  }

  /**
   * Task 14.3: Validate, upload to Cloudinary, persist metadata (batch).
   * Validates: Requirements 12.1, 12.2, 12.7
   */
  async uploadPhotos(
    mahberId: string,
    eventId: string,
    uploaderId: string,
    files: any[],
    caption?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    if (files.length > 10) {
      throw new BadRequestException('You can upload up to 10 photos at a time');
    }

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG and PNG images are allowed');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException('File size exceeds the 10MB limit');
      }
      if (!file.buffer) {
        throw new BadRequestException('File buffer is missing. Upload failed.');
      }
    }

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, mahber_id: mahberId },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    await this.checkStorageQuota(mahberId, files.length);

    const uploadResults: any[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const result = await this.uploadBufferToCloudinary(file.buffer, {
          folder: `events/${mahberId}/${eventId}`,
          public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${index}`,
          eager: [
            {
              width: 300,
              height: 300,
              crop: 'thumb',
              gravity: 'auto',
            },
          ],
          context: caption ? `caption=${caption}` : undefined,
          tags: `event_${eventId}`,
        });
        uploadResults.push(result);
      }
    } catch (error) {
      // Best-effort cleanup of any uploaded assets if a later upload fails
      await Promise.all(
        uploadResults
          .map((result) => result?.public_id)
          .filter(Boolean)
          .map((publicId) => this.cloudinary.uploader.destroy(publicId).catch(() => undefined)),
      );
      throw error;
    }

    const photos = await Promise.all(
      uploadResults.map((uploadResult) =>
        this.prisma.eventPhoto.create({
          data: {
            event_id: eventId,
            mahber_id: mahberId,
            uploader_id: uploaderId,
            file_path: uploadResult.secure_url,
            thumbnail_path: uploadResult.eager?.[0]?.secure_url,
            caption: caption ?? null,
            cloudinary_public_id: uploadResult.public_id,
          },
        }),
      ),
    );

    this.logger.log(
      `Photos uploaded: count=${photos.length} event=${eventId} mahber=${mahberId} uploader=${uploaderId}`,
    );

    return {
      data: photos,
      meta: { uploaded: photos.length },
    };
  }

  /**
   * Task 14.4: Paginated photo listing with multi-tenancy isolation.
   * Validates: Requirement 12.4
   */
  async findAll(mahberId: string, eventId: string, page: number, limit: number) {
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
  async deletePhoto(mahberId: string, eventId: string, photoId: string, actorId: string) {
    const photo = await this.prisma.eventPhoto.findFirst({
      where: { id: photoId, event_id: eventId, mahber_id: mahberId },
    });

    if (!photo) {
      throw new NotFoundException(`Photo ${photoId} not found`);
    }

    const isUploader = photo.uploader_id === actorId;

    const membership = await this.prisma.membership.findFirst({
      where: { member_id: actorId, mahber_id: mahberId, status: 'Active' },
    });

    const role = membership?.role as { permissions?: string[] } | null;
    const isAdmin = role?.permissions?.includes('manage_members') ?? false;

    if (!isUploader && !isAdmin) {
      throw new ForbiddenException('Only the photo uploader or an admin can delete this photo');
    }

    if (photo.cloudinary_public_id) {
      try {
        await this.cloudinary.uploader.destroy(photo.cloudinary_public_id);
      } catch (err) {
        this.logger.warn(`Failed to delete from Cloudinary: ${photo.cloudinary_public_id}`);
      }
    }

    await this.prisma.eventPhoto.delete({ where: { id: photoId } });

    this.logger.log(
      `Photo deleted: id=${photoId} event=${eventId} mahber=${mahberId} actor=${actorId}`,
    );

    return { message: 'Photo deleted successfully' };
  }
}
