import { IsString, IsNotEmpty } from 'class-validator';

export class ManualCheckInDto {
  @IsString()
  @IsNotEmpty()
  member_id: string;
}
