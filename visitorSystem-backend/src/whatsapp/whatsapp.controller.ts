import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { SendQRCodeDto } from './dto/send-qrcode.dto';
import { BatchSendQRCodeDto } from './dto/batch-send-qrcode.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('whatsapp')
@Controller('whatsapp')
@ApiBearerAuth()
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

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
}
