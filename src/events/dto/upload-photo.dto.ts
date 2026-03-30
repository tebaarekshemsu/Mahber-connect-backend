import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadPhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
