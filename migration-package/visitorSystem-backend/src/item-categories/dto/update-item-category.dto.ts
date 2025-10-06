import { PartialType } from '@nestjs/mapped-types';
import { CreateItemCategoryDto } from './create-item-category.dto';

export class UpdateItemCategoryDto extends PartialType(CreateItemCategoryDto) {}
