import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { ItemCategory, ItemCategoryStatus } from '@prisma/client';

@Injectable()
export class ItemCategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createItemCategoryDto: CreateItemCategoryDto): Promise<ItemCategory> {
    try {
      // 检查分类名称是否已存在
      const existingCategory = await this.prisma.itemCategory.findUnique({
        where: { name: createItemCategoryDto.name }
      });

      if (existingCategory) {
        throw new ConflictException('分类名称已存在');
      }

      const itemCategory = await this.prisma.itemCategory.create({
        data: {
          name: createItemCategoryDto.name,
          description: createItemCategoryDto.description,
          status: createItemCategoryDto.status || ItemCategoryStatus.ACTIVE,
        },
      });

      return itemCategory;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('创建分类失败');
    }
  }

  async findAll(): Promise<ItemCategory[]> {
    return this.prisma.itemCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string): Promise<ItemCategory> {
    const itemCategory = await this.prisma.itemCategory.findUnique({
      where: { id },
    });

    if (!itemCategory) {
      throw new NotFoundException('分类不存在');
    }

    return itemCategory;
  }

  async update(id: string, updateItemCategoryDto: UpdateItemCategoryDto): Promise<ItemCategory> {
    try {
      // 检查分类是否存在
      const existingCategory = await this.findOne(id);

      // 如果要更新名称，检查新名称是否已存在
      if (updateItemCategoryDto.name && updateItemCategoryDto.name !== existingCategory.name) {
        const nameExists = await this.prisma.itemCategory.findUnique({
          where: { name: updateItemCategoryDto.name }
        });

        if (nameExists) {
          throw new ConflictException('分类名称已存在');
        }
      }

      const updatedCategory = await this.prisma.itemCategory.update({
        where: { id },
        data: updateItemCategoryDto,
      });

      return updatedCategory;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('更新分类失败');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      // 检查分类是否存在
      await this.findOne(id);

      // 检查是否有物品使用此分类
      const itemsCount = await this.prisma.item.count({
        where: { categoryId: id }
      });

      if (itemsCount > 0) {
        throw new BadRequestException('该分类下还有物品，无法删除');
      }

      await this.prisma.itemCategory.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('删除分类失败');
    }
  }

  async toggleStatus(id: string): Promise<ItemCategory> {
    try {
      const category = await this.findOne(id);
      
      const newStatus = category.status === ItemCategoryStatus.ACTIVE 
        ? ItemCategoryStatus.INACTIVE 
        : ItemCategoryStatus.ACTIVE;

      return this.prisma.itemCategory.update({
        where: { id },
        data: { status: newStatus },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('切换状态失败');
    }
  }
}
