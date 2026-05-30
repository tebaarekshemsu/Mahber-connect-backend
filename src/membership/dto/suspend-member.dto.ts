import { IsInt, IsOptional, Min, IsString } from 'class-validator';

export class SuspendMemberDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  duration_days?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
