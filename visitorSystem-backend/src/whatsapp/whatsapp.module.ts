import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [ConfigModule, HttpModule, PrismaModule, SystemConfigModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppQueueService],
  exports: [WhatsAppService, WhatsAppQueueService],
})
export class WhatsAppModule {}
