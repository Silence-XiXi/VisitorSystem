import { Controller, Get, Post, Body, Query, UseInterceptors, BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkerRegistrationService } from './worker-registration.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreateWorkerDto } from './dto/create-worker.dto';

@Controller('public/worker-registration')
export class WorkerRegistrationController {
  constructor(private readonly workerRegistrationService: WorkerRegistrationService) {}

  @Public()
  @Get('info')
  async getRegistrationInfo(
    @Query('distributorId') distributorId: string,
    @Query('siteId') siteId: string,
  ) {
    if (!distributorId || !siteId) {
      throw new BadRequestException('分判商ID和工地ID为必填项');
    }

    const result = await this.workerRegistrationService.getRegistrationInfo(distributorId, siteId);
    
    if (!result.distributor || !result.site) {
      throw new NotFoundException('找不到指定的分判商或工地信息');
    }
    
    return result;
  }

  @Public()
  @Get('check-id')
  async checkIdNumberExists(@Query('idNumber') idNumber: string) {
    if (!idNumber) {
      throw new BadRequestException('证件号码为必填项');
    }

    const exists = await this.workerRegistrationService.checkIdNumberExists(idNumber);
    return { exists };
  }

  @Public()
  @Post('register')
  async registerWorker(@Body() createWorkerDto: CreateWorkerDto) {
    if (!createWorkerDto.distributorId || !createWorkerDto.siteId) {
      throw new BadRequestException('分判商ID和工地ID为必填项');
    }
    
    return this.workerRegistrationService.registerWorker(createWorkerDto);
  }
}
