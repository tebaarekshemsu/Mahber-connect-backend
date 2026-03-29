import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ProcessJoinRequestDto {
  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ValidateIf((o) => o.action === 'reject')
  @IsString()
  rejection_reason?: string;
}
