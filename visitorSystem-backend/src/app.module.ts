import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RedisModule } from './redis/redis.module';
import { CacheExampleModule } from './cache/cache-example.module';
import { DistributorsModule } from './distributors/distributors.module';
import { GuardsModule } from './guards/guards.module';
import { AdminModule } from './admin/admin.module';
import { ItemCategoriesModule } from './item-categories/item-categories.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    CacheExampleModule,
    DistributorsModule,
    GuardsModule,
    AdminModule,
    ItemCategoriesModule,
  ],
})
export class AppModule {}
