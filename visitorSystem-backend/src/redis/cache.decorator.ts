import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';

/**
 * 缓存装饰器
 * @param key 缓存键
 * @param ttl 过期时间（秒）
 */
export const Cacheable = (key: string, ttl?: number) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY_METADATA, key)(target, propertyName, descriptor);
    if (ttl) {
      SetMetadata(CACHE_TTL_METADATA, ttl)(target, propertyName, descriptor);
    }
    return descriptor;
  };
};

/**
 * 清除缓存装饰器
 * @param keys 要清除的缓存键数组
 */
export const CacheEvict = (...keys: string[]) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    SetMetadata('cache_evict', keys)(target, propertyName, descriptor);
    return descriptor;
  };
};
