import { Module } from '@nestjs/common'
import { VisitorRecordsService } from './visitor-records.service'
import { VisitorRecordsController } from './visitor-records.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [VisitorRecordsController],
  providers: [VisitorRecordsService],
  exports: [VisitorRecordsService]
})
export class VisitorRecordsModule {}
