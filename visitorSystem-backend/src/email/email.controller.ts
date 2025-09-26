import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsEmail, IsString, IsNotEmpty, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
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
  
  @IsString()
  language?: string; // 可选的语言参数
}

export class SendDistributorAccountDto {
  @IsEmail()
  @IsNotEmpty()
  distributorEmail: string;

  @IsString()
  @IsNotEmpty()
  distributorName: string;

  @IsString()
  @IsNotEmpty()
  username: string;
  
  @IsString()
  @IsNotEmpty()
  password: string;
  
  @IsString()
  @IsNotEmpty()
  loginUrl: string;
  
  @IsString()
  language?: string; // 可选的语言参数
}

export class BatchSendDistributorAccountDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个分判商数据' })
  @ValidateNested({ each: true })
  @Type(() => DistributorAccountDto)
  distributors: DistributorAccountDto[];
  
  @IsString()
  @IsNotEmpty()
  loginUrl: string;
  
  @IsString()
  language?: string;
}

class DistributorAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  
  @IsString()
  @IsNotEmpty()
  name: string;
  
  @IsString()
  @IsNotEmpty()
  username: string;
  
  @IsString()
  @IsNotEmpty()
  password: string;
}

// 定义单个工人的DTO
class WorkerQRCodeDto {
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

export class BatchSendQRCodeEmailDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个工人数据' })
  @ValidateNested({ each: true })
  @Type(() => WorkerQRCodeDto)
  workers: WorkerQRCodeDto[];
  
  @IsString()
  language?: string; // 可选的语言参数
}

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-qrcode')
  @Roles(UserRole.ADMIN, UserRole.DISTRIBUTOR, UserRole.GUARD)
  async sendQRCodeEmail(@Body() body: SendQRCodeEmailDto) {
    const { workerEmail, workerName, workerId, qrCodeDataUrl, language } = body;

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

    // 验证语言参数格式
    const validLanguages = ['zh-TW', 'zh-CN', 'en-US'];
    const selectedLanguage = language && validLanguages.includes(language) ? language : 'zh-TW';

    try {
      const success = await this.emailService.sendWorkerQRCodeEmail(
        workerEmail,
        workerName,
        workerId,
        qrCodeDataUrl,
        selectedLanguage,
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

  @Post('batch-send-qrcode')
  @Roles(UserRole.ADMIN, UserRole.DISTRIBUTOR)
  async batchSendQRCodeEmail(@Body() body: BatchSendQRCodeEmailDto) {
    const { workers, language } = body;

    // 验证批量发送请求
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      throw new BadRequestException('工人数据不能为空');
    }

    // 限制一次最多发送数量
    const MAX_BATCH_SIZE = 50;
    if (workers.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(`一次最多发送${MAX_BATCH_SIZE}个二维码`);
    }

    // 验证语言参数
    const validLanguages = ['zh-TW', 'zh-CN', 'en-US'];
    const selectedLanguage = language && validLanguages.includes(language) ? language : 'zh-TW';

    // 批量处理结果
    const results = {
      total: workers.length,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{
        workerId: string;
        workerName: string;
        success: boolean;
        message?: string;
      }>
    };

    // 准备所有要发送的邮件任务
    const emailTasks = workers.map(worker => {
      // 验证工人数据
      if (!worker.workerEmail || !worker.workerName || !worker.workerId || !worker.qrCodeDataUrl) {
        results.details.push({
          workerId: worker.workerId || '未知',
          workerName: worker.workerName || '未知',
          success: false,
          message: '工人数据不完整'
        });
        return Promise.resolve();
      }
      
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(worker.workerEmail)) {
        results.details.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          success: false,
          message: '邮箱格式不正确'
        });
        return Promise.resolve();
      }

      // 验证二维码数据URL格式
      if (!worker.qrCodeDataUrl.startsWith('data:image/')) {
        results.details.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          success: false,
          message: '二维码数据格式不正确'
        });
        return Promise.resolve();
      }

      // 返回发送邮件的Promise
      return this.emailService.sendWorkerQRCodeEmail(
        worker.workerEmail,
        worker.workerName,
        worker.workerId,
        worker.qrCodeDataUrl,
        selectedLanguage
      ).then(success => {
        if (success) {
          results.succeeded++;
          results.details.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            success: true
          });
        } else {
          results.failed++;
          results.details.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            success: false,
            message: '邮件发送失败'
          });
        }
      }).catch(error => {
        results.failed++;
        results.details.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          success: false,
          message: `邮件发送错误: ${error.message}`
        });
      });
    });

    // 并行执行所有邮件发送任务
    try {
      await Promise.all(emailTasks);
      
      return {
        success: true,
        message: `批量发送完成，成功: ${results.succeeded}, 失败: ${results.failed}`,
        results
      };
    } catch (error) {
      throw new BadRequestException(`批量发送邮件失败: ${error.message}`);
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
  
  
  @Post('send-distributor-account')
  @Roles(UserRole.ADMIN)
  async sendDistributorAccountEmail(@Body() body: SendDistributorAccountDto) {
    try {
      const { distributorEmail, distributorName, username, password, loginUrl, language } = body;
      
      console.log('接收分判商账号邮件请求:', {
        email: distributorEmail, 
        name: distributorName, 
        username,
        loginUrl,
        languageProvided: !!language
      });
  
      // 验证必填字段
      if (!distributorEmail || !distributorName || !username || !password || !loginUrl) {
        console.error('缺少必填字段', { 
          hasEmail: !!distributorEmail, 
          hasName: !!distributorName, 
          hasUsername: !!username,
          hasPassword: !!password,
          hasLoginUrl: !!loginUrl
        });
        return {
          success: false,
          message: '缺少必填字段',
          details: { missingFields: [
            !distributorEmail && 'distributorEmail',
            !distributorName && 'distributorName',
            !username && 'username',
            !password && 'password',
            !loginUrl && 'loginUrl',
          ].filter(Boolean) }
        };
      }
  
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(distributorEmail)) {
        console.error('邮箱格式不正确', { email: distributorEmail });
        return {
          success: false,
          message: '邮箱格式不正确',
          details: { email: distributorEmail }
        };
      }
  
      // 验证语言参数格式
      const validLanguages = ['zh-TW', 'zh-CN', 'en-US'];
      const selectedLanguage = language && validLanguages.includes(language) ? language : 'zh-CN';
      console.log('使用语言:', selectedLanguage);
  
      try {
        // 先检查邮件配置
        try {
          await this.emailService.testEmailConfig();
        } catch (configError) {
          console.error('邮件配置检查失败:', configError);
          return {
            success: false,
            message: `邮件服务配置错误: ${configError.message}`,
            error: configError.message,
            step: 'config'
          };
        }
        
        // 发送实际邮件
        const success = await this.emailService.sendDistributorAccountEmail(
          distributorEmail,
          distributorName,
          username,
          password,
          loginUrl,
          selectedLanguage,
        );
  
        if (success) {
          return {
            success: true,
            message: '邮件发送成功',
          };
        } else {
          console.error('邮件服务返回失败状态');
          return {
            success: false,
            message: '邮件发送失败',
            error: '邮件服务返回失败',
            step: 'send'
          };
        }
      } catch (error) {
        console.error('邮件发送异常:', error);
        return {
          success: false,
          message: `邮件发送失败: ${error.message || '未知错误'}`,
          error: error.message,
          stack: error.stack,
          step: 'send'
        };
      }
    } catch (error) {
      console.error('处理请求异常:', error);
      return {
        success: false,
        message: `请求处理失败: ${error.message || '未知错误'}`,
        error: error.message,
        stack: error.stack
      };
    }
  }
  
  @Post('batch-send-distributor-accounts')
  @Roles(UserRole.ADMIN)
  async batchSendDistributorAccountEmails(@Body() body: BatchSendDistributorAccountDto) {
    const { distributors, loginUrl, language } = body;

    // 验证批量发送请求
    if (!distributors || !Array.isArray(distributors) || distributors.length === 0) {
      throw new BadRequestException('分判商数据不能为空');
    }

    // 限制一次最多发送数量
    const MAX_BATCH_SIZE = 50;
    if (distributors.length > MAX_BATCH_SIZE) {
      throw new BadRequestException(`一次最多发送${MAX_BATCH_SIZE}个账号信息`);
    }

    // 验证语言参数
    const validLanguages = ['zh-TW', 'zh-CN', 'en-US'];
    const selectedLanguage = language && validLanguages.includes(language) ? language : 'zh-CN';

    try {
      const result = await this.emailService.batchSendDistributorAccountEmails(
        distributors,
        loginUrl,
        selectedLanguage
      );

      return {
        success: true,
        message: `批量发送完成，成功: ${result.success}, 失败: ${result.failed}`,
        results: result
      };
    } catch (error) {
      throw new BadRequestException(`批量发送分判商账号邮件失败: ${error.message}`);
    }
  }
}
