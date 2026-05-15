import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class BatchProcessItem {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsEnum(['approve', 'reject'])
  action: 'approve' | 'reject';

  @ValidateIf((o) => o.action === 'reject')
  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

export class BatchProcessJoinRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchProcessItem)
  requests: BatchProcessItem[];
}
