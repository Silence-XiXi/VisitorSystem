import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

export class SendQRCodeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  workerEmail: string;

  @IsString()
  @IsNotEmpty()
  workerName: string;

  @IsString()
  @IsNotEmpty()
  workerId: string;

  @IsString()
  @IsNotEmpty()
  qrCodeDataUrl: string;
}

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-qrcode')
  @Roles(UserRole.ADMIN, UserRole.DISTRIBUTOR, UserRole.GUARD)
  async sendQRCodeEmail(@Body() body: any) {
    const { workerEmail, workerName, workerId, qrCodeDataUrl } = body;

    // 验证必填字段
    if (!workerEmail || !workerName || !workerId || !qrCodeDataUrl) {
      throw new BadRequestException('缺少必填字段');
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workerEmail)) {
      throw new BadRequestException('邮箱格式不正确');
    }

    // 验证二维码数据URL格式
    if (!qrCodeDataUrl.startsWith('data:image/')) {
      throw new BadRequestException('二维码数据格式不正确');
    }

    try {
      const success = await this.emailService.sendWorkerQRCodeEmail(
        workerEmail,
        workerName,
        workerId,
        qrCodeDataUrl,
      );

      if (success) {
        return {
          success: true,
          message: '邮件发送成功',
        };
      } else {
        throw new BadRequestException('邮件发送失败');
      }
    } catch (error) {
      throw new BadRequestException(`邮件发送失败: ${error.message}`);
    }
  }

  @Post('test-config')
  @Roles(UserRole.ADMIN)
  async testEmailConfig() {
    try {
      const success = await this.emailService.testEmailConfig();
      
      if (success) {
        return {
          success: true,
          message: '邮件配置测试成功',
        };
      } else {
        throw new BadRequestException('邮件配置测试失败');
      }
    } catch (error) {
      throw new BadRequestException(`邮件配置测试失败: ${error.message}`);
    }
  }

  @Get('test-simple')
  @Roles(UserRole.ADMIN)
  async testSimple() {
    return {
      success: true,
      message: '邮件控制器工作正常',
      timestamp: new Date().toISOString()
    };
  }
}
