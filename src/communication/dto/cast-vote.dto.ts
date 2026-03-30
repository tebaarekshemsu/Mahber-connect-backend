import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CastVoteDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  choices: string[]; // array of option IDs
}
