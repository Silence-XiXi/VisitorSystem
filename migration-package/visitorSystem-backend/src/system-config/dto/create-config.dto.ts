import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConfigDto {
  @IsString()
  @IsNotEmpty()
  config_key: string;

  @IsString()
  @IsNotEmpty()
  config_value: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_encrypted?: boolean;
}
