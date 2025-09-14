import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetCurrentUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { UserRole } from '@prisma/client';

@ApiTags('管理员管理')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取系统统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getSystemStats(@GetCurrentUser() user: CurrentUser) {
    return this.adminService.getSystemStats(user);
  }

  @Get('distributors')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有分销商列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllDistributors(@GetCurrentUser() user: CurrentUser) {
    return this.adminService.getAllDistributors(user);
  }

  @Get('sites')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有工地列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllSites(@GetCurrentUser() user: CurrentUser) {
    return this.adminService.getAllSites(user);
  }

  @Get('guards')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取门卫列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiQuery({ name: 'siteId', required: false, description: '工地ID，用于筛选特定工地的门卫' })
  async getAllGuards(@GetCurrentUser() user: CurrentUser, @Query('siteId') siteId?: string) {
    return this.adminService.getAllGuards(user, siteId);
  }

  @Get('workers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有工人列表' })
  @ApiQuery({ name: 'distributorId', required: false, description: '分销商ID' })
  @ApiQuery({ name: 'siteId', required: false, description: '工地ID' })
  @ApiQuery({ name: 'status', required: false, description: '工人状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllWorkers(
    @GetCurrentUser() user: CurrentUser,
    @Query('distributorId') distributorId?: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string
  ) {
    const filters = { distributorId, siteId, status };
    return this.adminService.getAllWorkers(user, filters);
  }

  @Post('workers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建工人' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createWorker(
    @GetCurrentUser() user: CurrentUser,
    @Body() workerData: any
  ) {
    return this.adminService.createWorker(user, workerData);
  }

  @Put('workers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新工人信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async updateWorker(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') workerId: string,
    @Body() updateData: any
  ) {
    return this.adminService.updateWorker(user, workerId, updateData);
  }

  @Delete('workers/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除工人' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async deleteWorker(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') workerId: string
  ) {
    return this.adminService.deleteWorker(user, workerId);
  }

  @Get('workers/export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '导出工人数据' })
  @ApiQuery({ name: 'siteId', required: false, description: '工地ID' })
  @ApiQuery({ name: 'distributorId', required: false, description: '分判商ID' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选' })
  async exportWorkers(
    @GetCurrentUser() user: CurrentUser,
    @Query('siteId') siteId?: string,
    @Query('distributorId') distributorId?: string,
    @Query('status') status?: string
  ) {
    return this.adminService.exportWorkers(user, { siteId, distributorId, status });
  }

  @Post('workers/import')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '导入工人数据' })
  @ApiResponse({ status: 200, description: '导入成功' })
  @ApiResponse({ status: 400, description: '导入数据格式错误' })
  async importWorkers(
    @GetCurrentUser() user: CurrentUser,
    @Body() importData: { workers: any[] }
  ) {
    return this.adminService.importWorkers(user, importData.workers);
  }

  @Get('workers/template')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '下载工人导入模板' })
  async downloadWorkerTemplate(@GetCurrentUser() user: CurrentUser) {
    return this.adminService.downloadWorkerTemplate(user);
  }

  @Post('distributors')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建分销商' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createDistributor(
    @GetCurrentUser() user: CurrentUser,
    @Body() distributorData: any
  ) {
    return this.adminService.createDistributor(user, distributorData);
  }

  @Put('distributors/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新分销商' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '分销商不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateDistributor(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') distributorId: string,
    @Body() distributorData: any
  ) {
    return this.adminService.updateDistributor(user, distributorId, distributorData);
  }

  @Post('guards')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建门卫' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createGuard(
    @GetCurrentUser() user: CurrentUser,
    @Body() guardData: any
  ) {
    return this.adminService.createGuard(user, guardData);
  }

  @Post('sites')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '创建工地' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async createSite(
    @GetCurrentUser() user: CurrentUser,
    @Body() siteData: any
  ) {
    return this.adminService.createSite(user, siteData);
  }

  @Put('sites/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新工地' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '工地不存在' })
  async updateSite(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() siteData: any
  ) {
    return this.adminService.updateSite(user, id, siteData);
  }

  @Put('users/:id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新用户状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateUserStatus(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') userId: string,
    @Body() body: { status: string }
  ) {
    return this.adminService.updateUserStatus(user, userId, body.status);
  }

  @Get('logs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取系统日志' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSystemLogs(@GetCurrentUser() user: CurrentUser) {
    return this.adminService.getSystemLogs(user);
  }

  @Post('distributors/:id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重置分判商密码' })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 404, description: '分判商不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async resetDistributorPassword(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') distributorId: string
  ) {
    return this.adminService.resetDistributorPassword(user, distributorId);
  }

  @Post('guards/:id/reset-password')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '重置门卫密码' })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiResponse({ status: 404, description: '门卫不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async resetGuardPassword(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') guardId: string
  ) {
    return this.adminService.resetGuardPassword(user, guardId);
  }

  @Put('guards/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '更新门卫信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '门卫不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 409, description: '用户名已存在' })
  async updateGuard(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') guardId: string,
    @Body() guardData: any
  ) {
    return this.adminService.updateGuard(user, guardId, guardData);
  }

  @Delete('guards/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除门卫' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '门卫不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteGuard(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') guardId: string
  ) {
    return this.adminService.deleteGuard(user, guardId);
  }

  @Patch('guards/:id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '切换门卫账户状态' })
  @ApiResponse({ status: 200, description: '状态切换成功' })
  @ApiResponse({ status: 404, description: '门卫不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async toggleGuardStatus(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') guardId: string
  ) {
    return this.adminService.toggleGuardStatus(user, guardId);
  }

  // 删除分判商
  @Delete('distributors/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '删除分判商' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '分判商不存在' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async deleteDistributor(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') distributorId: string
  ) {
    return this.adminService.deleteDistributor(user, distributorId);
  }

  @Get('borrow-records')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '获取所有借用物品记录' })
  @ApiQuery({ name: 'siteId', required: false, description: '工地ID' })
  @ApiQuery({ name: 'status', required: false, description: '借用状态：BORROWED/RETURNED' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getAllBorrowRecords(
    @GetCurrentUser() user: CurrentUser,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.adminService.getAllBorrowRecords(user, {
      siteId,
      status,
      startDate,
      endDate
    });
  }
}
