import { IsString, IsNotEmpty } from 'class-validator';

export class AssignEventHostDto {
  @IsString()
  @IsNotEmpty()
  member_id: string;
}
