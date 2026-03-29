import { IsOptional, IsString } from 'class-validator';

export class CreateJoinRequestDto {
  @IsOptional()
  @IsString()
  invitation_code?: string;
}
