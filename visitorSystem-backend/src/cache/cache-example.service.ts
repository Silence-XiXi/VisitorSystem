import { Injectable, Inject } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { Cacheable, CacheEvict } from '../redis/cache.decorator';

@Injectable()
export class CacheExampleService {
  constructor(
    @Inject(RedisService) private redisService: RedisService,
  ) {}

  /**
   * 示例：缓存用户列表
   */
  @Cacheable('users:list', 300) // 缓存5分钟
  async getUsersList() {
    console.log('从数据库获取用户列表...');
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, 1000));
    return [
      { id: '1', username: 'admin', role: 'ADMIN' },
      { id: '2', username: 'distributor1', role: 'DISTRIBUTOR' },
      { id: '3', username: 'guard1', role: 'GUARD' },
    ];
  }

  /**
   * 示例：缓存单个用户信息
   */
  @Cacheable('user:', 600) // 缓存10分钟
  async getUserById(id: string) {
    console.log(`从数据库获取用户 ${id}...`);
    // 模拟数据库查询
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      id,
      username: `user${id}`,
      role: 'USER',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 示例：清除用户相关缓存
   */
  @CacheEvict('users:list', 'user:')
  async updateUser(id: string, data: any) {
    console.log(`更新用户 ${id}...`);
    // 模拟数据库更新
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 清除相关缓存
    await this.redisService.del(`user:${id}`);
    await this.redisService.del('users:list');
    
    return { id, ...data, updatedAt: new Date().toISOString() };
  }

  /**
   * 示例：手动缓存操作
   */
  async cacheUserActivity(userId: string, activity: string) {
    const key = `user:${userId}:activity`;
    const activities = await this.redisService.get(key) || [];
    
    activities.push({
      activity,
      timestamp: new Date().toISOString(),
    });
    
    // 只保留最近10条活动记录
    const recentActivities = activities.slice(-10);
    await this.redisService.set(key, recentActivities, 3600); // 缓存1小时
    
    return recentActivities;
  }

  /**
   * 示例：获取用户活动记录
   */
  async getUserActivity(userId: string) {
    const key = `user:${userId}:activity`;
    return await this.redisService.get(key) || [];
  }

  /**
   * 示例：缓存统计数据
   */
  async getSystemStats() {
    const cacheKey = 'system:stats';
    let stats = await this.redisService.get(cacheKey);
    
    if (!stats) {
      console.log('计算系统统计数据...');
      // 模拟复杂的统计计算
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      stats = {
        totalUsers: 150,
        activeUsers: 45,
        totalSites: 12,
        totalWorkers: 1200,
        lastUpdated: new Date().toISOString(),
      };
      
      // 缓存30分钟
      await this.redisService.set(cacheKey, stats, 1800);
    }
    
    return stats;
  }

  /**
   * 示例：清除所有缓存
   */
  async clearAllCache() {
    await this.redisService.flushAll();
    return { message: '所有缓存已清除' };
  }
}
