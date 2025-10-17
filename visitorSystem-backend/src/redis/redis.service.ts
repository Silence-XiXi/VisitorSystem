import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    // 创建Redis连接
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
    });

    // 监听连接事件
    this.redis.on('connect', () => {
      // console.log('Redis连接成功');
    });

    this.redis.on('error', (err) => {
      console.error('Redis连接错误:', err);
    });
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.cacheManager.set(key, value, ttl * 1000); // ttl转换为毫秒
    } else {
      await this.cacheManager.set(key, value);
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   */
  async get<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 检查键是否存在
   * @param key 缓存键
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * 设置过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  /**
   * 获取剩余过期时间
   * @param key 缓存键
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * 清空所有缓存
   */
  async flushAll(): Promise<void> {
    await this.redis.flushall();
  }

  /**
   * 获取Redis原始客户端（用于复杂操作）
   */
  getRedisClient(): Redis {
    return this.redis;
  }

  /**
   * 会话相关方法
   */
  
  /**
   * 设置用户会话
   * @param userId 用户ID
   * @param sessionData 会话数据
   * @param ttl 过期时间（秒，默认7天）
   */
  async setUserSession(userId: string, sessionData: any, ttl: number = 7 * 24 * 60 * 60): Promise<void> {
    const key = `session:${userId}`;
    await this.set(key, sessionData, ttl);
  }

  /**
   * 获取用户会话
   * @param userId 用户ID
   */
  async getUserSession(userId: string): Promise<any> {
    const key = `session:${userId}`;
    return await this.get(key);
  }

  /**
   * 删除用户会话
   * @param userId 用户ID
   */
  async deleteUserSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.del(key);
  }

  /**
   * 频率限制相关方法
   */
  
  /**
   * 检查API调用频率限制
   * @param identifier 标识符（IP、用户ID等）
   * @param limit 限制次数
   * @param window 时间窗口（秒）
   */
  async checkRateLimit(identifier: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    
    const ttl = await this.redis.ttl(key);
    const remaining = Math.max(0, limit - current);
    const resetTime = Date.now() + (ttl * 1000);
    
    return {
      allowed: current <= limit,
      remaining,
      resetTime
    };
  }

  /**
   * 重置频率限制
   * @param identifier 标识符
   */
  async resetRateLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await this.redis.del(key);
  }
}
