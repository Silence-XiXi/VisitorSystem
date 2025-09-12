import { IsString, IsOptional, IsEnum, IsNotEmpty, MaxLength } from 'class-validator';
import { ItemCategoryStatus } from '@prisma/client';

export class CreateItemCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(ItemCategoryStatus)
  @IsOptional()
  status?: ItemCategoryStatus;
}
