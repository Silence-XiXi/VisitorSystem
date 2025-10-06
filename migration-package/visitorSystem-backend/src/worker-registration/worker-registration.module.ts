import { Module } from '@nestjs/common';
import { WorkerRegistrationController } from './worker-registration.controller';
import { WorkerRegistrationService } from './worker-registration.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WorkerRegistrationController],
  providers: [WorkerRegistrationService],
})
export class WorkerRegistrationModule {}
