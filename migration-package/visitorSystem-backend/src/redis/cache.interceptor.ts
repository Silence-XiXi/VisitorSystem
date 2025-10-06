import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from './cache.decorator';
import { RedisService } from './redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(RedisService) private redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    // 尝试从缓存获取数据
    const cachedData = await this.redisService.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    // 如果缓存中没有数据，执行原方法并缓存结果
    return next.handle().pipe(
      tap(async (data) => {
        if (data) {
          await this.redisService.set(cacheKey, data, cacheTTL);
        }
      }),
    );
  }
}
