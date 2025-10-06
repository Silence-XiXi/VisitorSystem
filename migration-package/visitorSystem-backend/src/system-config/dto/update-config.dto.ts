import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  @IsOptional()
  config_value?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_encrypted?: boolean;
}
