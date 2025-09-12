import { Module } from '@nestjs/common';
import { ItemCategoriesService } from './item-categories.service';
import { ItemCategoriesController } from './item-categories.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ItemCategoriesController],
  providers: [ItemCategoriesService],
  exports: [ItemCategoriesService],
})
export class ItemCategoriesModule {}
