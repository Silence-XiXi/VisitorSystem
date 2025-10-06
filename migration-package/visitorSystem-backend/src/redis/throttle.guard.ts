import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';

export const THROTTLE_KEY = 'throttle';
export const Throttle = (limit: number, window: number) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(THROTTLE_KEY, { limit, window }, target, propertyName);
    return descriptor;
  };
};

@Injectable()
export class ThrottleGuard implements CanActivate {
  constructor(
    private redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { limit, window } = this.reflector.get(THROTTLE_KEY, context.getHandler()) || {};

    if (!limit || !window) {
      return true; // 如果没有配置限制，允许通过
    }

    // 获取客户端标识符（优先使用用户ID，否则使用IP）
    const identifier = request.user?.id || request.ip || 'anonymous';
    const key = `${request.route?.path || 'unknown'}:${identifier}`;

    const rateLimit = await this.redisService.checkRateLimit(key, limit, window);

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          message: '请求过于频繁，请稍后再试',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          remaining: rateLimit.remaining,
          resetTime: rateLimit.resetTime,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 在响应头中添加限制信息
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    response.setHeader('X-RateLimit-Reset', rateLimit.resetTime);

    return true;
  }
}
