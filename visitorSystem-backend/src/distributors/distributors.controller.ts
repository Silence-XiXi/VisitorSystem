import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { DistributorsService } from './distributors.service';
import { UserRole } from '@prisma/client';

@ApiTags('分销商管理')
@Controller('distributors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  @Get('profile')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '获取当前分销商信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getCurrentDistributor(@GetCurrentUser() user: CurrentUser) {
    return this.distributorsService.getCurrentDistributor(user);
  }

  @Get('sites')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '获取分销商管理的工地列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDistributorSites(@GetCurrentUser() user: CurrentUser) {
    return this.distributorsService.getDistributorSites(user);
  }

  @Get('workers')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '获取分销商管理的工人列表' })
  @ApiQuery({ name: 'siteId', required: false, description: '工地ID，可选' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDistributorWorkers(
    @GetCurrentUser() user: CurrentUser,
    @Query('siteId') siteId?: string
  ) {
    return this.distributorsService.getDistributorWorkers(user, siteId);
  }

  @Post('workers')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '创建工人' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createWorker(
    @GetCurrentUser() user: CurrentUser,
    @Body() workerData: any
  ) {
    return this.distributorsService.createWorker(user, workerData);
  }

  @Put('workers/:id')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '更新工人信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async updateWorker(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') workerId: string,
    @Body() updateData: any
  ) {
    return this.distributorsService.updateWorker(user, workerId, updateData);
  }

  @Delete('workers/:id')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '删除工人' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async deleteWorker(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') workerId: string
  ) {
    return this.distributorsService.deleteWorker(user, workerId);
  }

  @Get('stats')
  @Roles(UserRole.DISTRIBUTOR)
  @ApiOperation({ summary: '获取分销商统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getDistributorStats(@GetCurrentUser() user: CurrentUser) {
    return this.distributorsService.getDistributorStats(user);
  }
}
