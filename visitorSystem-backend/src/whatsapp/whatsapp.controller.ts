import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { SendQRCodeDto } from './dto/send-qrcode.dto';
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
      sendQRCodeDto.qrCodeDataUrl
    );
  }
}
