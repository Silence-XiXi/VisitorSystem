import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ItemCategoriesService } from './item-categories.service';
import { CreateItemCategoryDto } from './dto/create-item-category.dto';
import { UpdateItemCategoryDto } from './dto/update-item-category.dto';
import { UserRole } from '@prisma/client';

@ApiTags('物品分类管理')
@Controller('item-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ItemCategoriesController {
  constructor(private readonly itemCategoriesService: ItemCategoriesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建物品分类' })
  @ApiResponse({ status: 201, description: '分类创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 409, description: '分类名称已存在' })
  create(@Body() createItemCategoryDto: CreateItemCategoryDto) {
    return this.itemCategoriesService.create(createItemCategoryDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  @ApiOperation({ summary: '获取所有物品分类' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll() {
    return this.itemCategoriesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  @ApiOperation({ summary: '根据ID获取物品分类' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  findOne(@Param('id') id: string) {
    return this.itemCategoriesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新物品分类' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  @ApiResponse({ status: 409, description: '分类名称已存在' })
  update(@Param('id') id: string, @Body() updateItemCategoryDto: UpdateItemCategoryDto) {
    return this.itemCategoriesService.update(id, updateItemCategoryDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除物品分类' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 400, description: '该分类下还有物品，无法删除' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  remove(@Param('id') id: string) {
    return this.itemCategoriesService.remove(id);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '切换分类状态' })
  @ApiResponse({ status: 200, description: '状态切换成功' })
  @ApiResponse({ status: 404, description: '分类不存在' })
  toggleStatus(@Param('id') id: string) {
    return this.itemCategoriesService.toggleStatus(id);
  }
}
