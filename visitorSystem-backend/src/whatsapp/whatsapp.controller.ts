import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { SendQRCodeDto } from './dto/send-qrcode.dto';
import { BatchSendQRCodeDto } from './dto/batch-send-qrcode.dto';
import { SendInviteLinkDto } from './dto/send-invite-link.dto';
import { AsyncBatchSendQRCodeDto } from './dto/async-batch-send-qrcode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('whatsapp')
@Controller('whatsapp')
@ApiBearerAuth()
export class WhatsAppController {
  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly whatsappQueueService: WhatsAppQueueService
  ) {}

  @Post('send-qrcode')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发送二维码到工人WhatsApp' })
  async sendQRCode(@Body() sendQRCodeDto: SendQRCodeDto): Promise<{ success: boolean; message: string }> {
    return this.whatsappService.sendQRCode(
      sendQRCodeDto.workerWhatsApp,
      sendQRCodeDto.workerName,
      sendQRCodeDto.qrCodeDataUrl,
      sendQRCodeDto.language
    );
  }

  @Post('batch-send-qrcode')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量发送二维码到工人WhatsApp' })
  async batchSendQRCode(@Body() batchSendQRCodeDto: BatchSendQRCodeDto): Promise<{
    success: boolean;
    message: string;
    results?: {
      total: number;
      succeeded: number;
      failed: number;
      details: Array<{
        workerId: string;
        workerName: string;
        success: boolean;
        message?: string;
      }>;
    };
  }> {
    return this.whatsappService.batchSendQRCode(
      batchSendQRCodeDto.workers,
      batchSendQRCodeDto.language
    );
  }

  @Post('send-invite-link')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '发送邀请链接到WhatsApp' })
  async sendInviteLink(@Body() sendInviteLinkDto: SendInviteLinkDto): Promise<{
    success: boolean;
    message: string;
    results?: {
      total: number;
      succeeded: number;
      failed: number;
      details: Array<{
        phoneNumber: string;
        success: boolean;
        message?: string;
      }>;
    };
  }> {
    return this.whatsappService.sendInviteLink(
      sendInviteLinkDto.phoneNumbers,
      sendInviteLinkDto.areaCode,
      sendInviteLinkDto.language,
      sendInviteLinkDto.distributorId,
      sendInviteLinkDto.siteId
    );
  }

  @Post('async-batch-send-qrcode')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '异步批量发送二维码到工人WhatsApp' })
  async asyncBatchSendQRCode(@Body() asyncBatchSendQRCodeDto: AsyncBatchSendQRCodeDto): Promise<{
    success: boolean;
    jobId: string;
    message: string;
  }> {
    const jobId = await this.whatsappQueueService.createJob(
      asyncBatchSendQRCodeDto.workers,
      asyncBatchSendQRCodeDto.language
    );

    return {
      success: true,
      jobId,
      message: 'WhatsApp发送任务已创建'
    };
  }

  @Get('job-progress/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取WhatsApp发送任务进度' })
  async getJobProgress(@Param('jobId') jobId: string): Promise<{
    success: boolean;
    progress?: any;
    message?: string;
  }> {
    return this.whatsappQueueService.getJobProgress(jobId);
  }

  @Post('cancel-job/:jobId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '取消WhatsApp发送任务' })
  async cancelJob(@Param('jobId') jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.whatsappQueueService.cancelJob(jobId);
  }
}
