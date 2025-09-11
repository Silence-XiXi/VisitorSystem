import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CacheExampleService } from './cache-example.service';
import { CacheExampleController } from './cache-example.controller';

@Module({
  imports: [RedisModule],
  providers: [CacheExampleService],
  controllers: [CacheExampleController],
  exports: [CacheExampleService],
})
export class CacheExampleModule {}
