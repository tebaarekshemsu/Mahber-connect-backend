import { IsArray, IsNotEmpty, IsString, ArrayNotEmpty } from 'class-validator';

export class CreateCustomRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permissions: string[];
}
