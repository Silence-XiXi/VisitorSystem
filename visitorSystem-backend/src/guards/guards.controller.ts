import { Controller, Get, Post, Put, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { GuardsService } from './guards.service';
import { UserRole } from '@prisma/client';

@ApiTags('门卫管理')
@Controller('guards')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GuardsController {
  constructor(private readonly guardsService: GuardsService) {}

  @Get('profile')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取当前门卫信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getCurrentGuard(@GetCurrentUser() user: CurrentUser) {
    return this.guardsService.getCurrentGuard(user);
  }

  @Get('workers')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取工地工人列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSiteWorkers(@GetCurrentUser() user: CurrentUser) {
    return this.guardsService.getSiteWorkers(user);
  }

  @Get('borrow-records')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取物品借用记录' })
  @ApiQuery({ name: 'status', required: false, description: '借用状态：BORROWED/RETURNED' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSiteBorrowRecords(
    @GetCurrentUser() user: CurrentUser,
    @Query('status') status?: string
  ) {
    return this.guardsService.getSiteBorrowRecords(user, status);
  }

  @Post('borrow-records')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '创建物品借用记录' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createBorrowRecord(
    @GetCurrentUser() user: CurrentUser,
    @Body() recordData: any
  ) {
    return this.guardsService.createBorrowRecord(user, recordData);
  }

  @Put('borrow-records/:id/return')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '归还物品' })
  @ApiResponse({ status: 200, description: '归还成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  async returnItem(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') recordId: string
  ) {
    return this.guardsService.returnItem(user, recordId);
  }

  @Get('stats')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取门卫统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getGuardStats(@GetCurrentUser() user: CurrentUser) {
    return this.guardsService.getGuardStats(user);
  }
}
