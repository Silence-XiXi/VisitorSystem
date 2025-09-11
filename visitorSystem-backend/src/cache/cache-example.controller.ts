import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottleGuard, Throttle } from '../redis/throttle.guard';
import { CacheExampleService } from './cache-example.service';

@ApiTags('缓存示例')
@Controller('cache-example')
@UseGuards(JwtAuthGuard, ThrottleGuard)
@ApiBearerAuth()
export class CacheExampleController {
  constructor(private readonly cacheExampleService: CacheExampleService) {}

  @Get('users')
  @Throttle(10, 60) // 每分钟最多10次请求
  @ApiOperation({ summary: '获取用户列表（带缓存）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUsersList() {
    return this.cacheExampleService.getUsersList();
  }

  @Get('users/:id')
  @Throttle(20, 60) // 每分钟最多20次请求
  @ApiOperation({ summary: '获取单个用户信息（带缓存）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserById(@Param('id') id: string) {
    return this.cacheExampleService.getUserById(id);
  }

  @Post('users/:id')
  @ApiOperation({ summary: '更新用户信息（清除缓存）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.cacheExampleService.updateUser(id, data);
  }

  @Post('users/:id/activity')
  @ApiOperation({ summary: '记录用户活动' })
  @ApiResponse({ status: 200, description: '记录成功' })
  async recordUserActivity(@Param('id') id: string, @Body() body: { activity: string }) {
    return this.cacheExampleService.cacheUserActivity(id, body.activity);
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: '获取用户活动记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserActivity(@Param('id') id: string) {
    return this.cacheExampleService.getUserActivity(id);
  }

  @Get('stats')
  @Throttle(5, 60) // 每分钟最多5次请求
  @ApiOperation({ summary: '获取系统统计数据（带缓存）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSystemStats() {
    return this.cacheExampleService.getSystemStats();
  }

  @Post('clear-cache')
  @ApiOperation({ summary: '清除所有缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  async clearAllCache() {
    return this.cacheExampleService.clearAllCache();
  }
}
