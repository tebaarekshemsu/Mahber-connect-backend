import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class MarkMessagesReadDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  message_ids: string[];
}
