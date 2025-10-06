import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GuardsService } from './guards.service';
import { GuardsController } from './guards.controller';

@Module({
  imports: [PrismaModule],
  providers: [GuardsService],
  controllers: [GuardsController],
  exports: [GuardsService],
})
export class GuardsModule {}
