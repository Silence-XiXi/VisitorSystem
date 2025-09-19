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

  @Get('workers/:workerId')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '根据工人编号查询工人信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async getWorkerByWorkerId(
    @GetCurrentUser() user: CurrentUser,
    @Param('workerId') workerId: string
  ) {
    return this.guardsService.getWorkerByWorkerId(user, workerId);
  }

  @Get('workers/identifier/:identifier')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '根据工人编号或实体卡编号查询工人信息' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async getWorkerByIdentifier(
    @GetCurrentUser() user: CurrentUser,
    @Param('identifier') identifier: string
  ) {
    return this.guardsService.getWorkerByIdentifier(user, identifier);
  }

  @Get('workers/:workerId/entry-record')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '检查工人是否有有效的入场记录' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 400, description: '工人未入场' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async checkWorkerEntryRecord(
    @GetCurrentUser() user: CurrentUser,
    @Param('workerId') workerId: string
  ) {
    return this.guardsService.checkWorkerEntryRecord(user, workerId);
  }
  
  @Get('visitor-records/physical-card/:physicalCardId')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '通过实体卡编号查询访客记录' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '未找到相关记录' })
  async getVisitorRecordByPhysicalCardId(
    @GetCurrentUser() user: CurrentUser,
    @Param('physicalCardId') physicalCardId: string
  ) {
    return this.guardsService.getVisitorRecordByPhysicalCardId(user, physicalCardId);
  }

  @Get('borrow-records')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取物品借用记录' })
  @ApiQuery({ name: 'status', required: false, description: '借用状态：BORROWED/RETURNED' })
  @ApiQuery({ name: 'workerId', required: false, description: '工人ID' })
  @ApiQuery({ name: 'visitorRecordId', required: false, description: '访客记录ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSiteBorrowRecords(
    @GetCurrentUser() user: CurrentUser,
    @Query('status') status?: string,
    @Query('workerId') workerId?: string,
    @Query('visitorRecordId') visitorRecordId?: string
  ) {
    return this.guardsService.getSiteBorrowRecords(user, status, workerId, visitorRecordId);
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

  @Get('visitor-records')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '获取门卫所在工地的访客记录' })
  @ApiQuery({ name: 'startDate', required: false, description: '入场开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: '入场结束日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'checkOutStartDate', required: false, description: '离场开始日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'checkOutEndDate', required: false, description: '离场结束日期 (YYYY-MM-DD)' })
  @ApiQuery({ name: 'status', required: false, description: '访客状态：ON_SITE/LEFT/PENDING' })
  @ApiQuery({ name: 'todayRelevant', required: false, description: '获取今日相关记录（今日入场、今日离场和所有未离场）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getGuardSiteVisitorRecords(
    @GetCurrentUser() user: CurrentUser,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('checkOutStartDate') checkOutStartDate?: string,
    @Query('checkOutEndDate') checkOutEndDate?: string,
    @Query('todayRelevant') todayRelevant?: string
  ) {
    return this.guardsService.getGuardSiteVisitorRecords(
      user, 
      startDate, 
      endDate, 
      status,
      checkOutStartDate,
      checkOutEndDate,
      todayRelevant === 'true'
    );
  }

  @Post('visitor-records')
  @Roles(UserRole.GUARD)
  @ApiOperation({ summary: '创建访客记录（入场登记）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '工人不存在' })
  async createVisitorRecord(
    @GetCurrentUser() user: CurrentUser,
    @Body() recordData: any
  ) {
    return this.guardsService.createVisitorRecord(user, recordData);
  }
}
