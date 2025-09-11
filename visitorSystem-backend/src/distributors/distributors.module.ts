import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DistributorsService } from './distributors.service';
import { DistributorsController } from './distributors.controller';

@Module({
  imports: [PrismaModule],
  providers: [DistributorsService],
  controllers: [DistributorsController],
  exports: [DistributorsService],
})
export class DistributorsModule {}
