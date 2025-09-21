import { Injectable, Logger } from '@nestjs/common';
import { SystemConfigService } from '../system-config/system-config.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly systemConfigService: SystemConfigService) {}

  // 获取邮件配置
  private async getEmailConfig() {
    try {
      const emailAddress = await this.systemConfigService.getConfigValue('EMAIL_ADDRESS');
      const emailHost = await this.systemConfigService.getConfigValue('EMAIL_HOST');
      const emailPort = await this.systemConfigService.getConfigValue('EMAIL_PORT');
      const emailPassword = await this.systemConfigService.getConfigValue('EMAIL_PASSWORD');

      if (!emailAddress || !emailHost || !emailPort || !emailPassword) {
        throw new Error('邮件配置不完整');
      }

      return {
        from: emailAddress,
        host: emailHost,
        port: parseInt(emailPort),
        password: emailPassword,
      };
    } catch (error) {
      this.logger.error('获取邮件配置失败:', error);
      throw new Error('邮件配置获取失败');
    }
  }

  // 创建邮件传输器
  private async createTransporter() {
    const config = await this.getEmailConfig();
    
    const transporterConfig: any = {
      host: config.host,
      port: config.port,
      secure: config.port === 465, // true for 465, false for other ports
      auth: {
        user: config.from,
        pass: config.password,
      },
      // 添加调试选项
      debug: false,
      logger: false,
    };

    // 对于非465端口的通用TLS配置
    if (config.port !== 465) {
      transporterConfig.requireTLS = true;
      transporterConfig.tls = {
        rejectUnauthorized: false,
      };
    }

    // 对于163邮箱的特殊配置
    if (config.host.includes('163.com')) {
      // 163邮箱在465端口使用SSL，其他端口使用TLS
      if (config.port === 465) {
        transporterConfig.secure = true;
        transporterConfig.tls = {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        };
      } else {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        transporterConfig.tls = {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        };
      }
      // 163邮箱需要特殊的连接配置
      transporterConfig.connectionTimeout = 60000;
      transporterConfig.greetingTimeout = 30000;
      transporterConfig.socketTimeout = 60000;
    }
    
    this.logger.log('创建邮件传输器配置:', {
      host: config.host,
      port: config.port,
      secure: transporterConfig.secure,
      user: config.from
    });
    
    return nodemailer.createTransport(transporterConfig);
  }

  // 发送工人二维码邮件
  async sendWorkerQRCodeEmail(
    workerEmail: string,
    workerName: string,
    workerId: string,
    qrCodeDataUrl: string,
  ): Promise<boolean> {
    try {
      const transporter = await this.createTransporter();
      const config = await this.getEmailConfig();

      // 将base64数据URL转换为附件
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const mailOptions = {
        from: config.from,
        to: workerEmail,
        subject: `工人二维码 - ${workerName} (${workerId})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">工人二维码</h2>
            <p>尊敬的 ${workerName}，</p>
            <p>您的工人二维码已生成，请查收附件中的二维码图片。</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">工人信息</h3>
              <p><strong>姓名:</strong> ${workerName}</p>
              <p><strong>工人编号:</strong> ${workerId}</p>
            </div>
            <p>请妥善保管此二维码，用于访客系统签到。</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              此邮件由系统自动发送，请勿回复。
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${workerName}_${workerId}_qrcode.png`,
            content: buffer,
            contentType: 'image/png',
          },
        ],
      };

      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`邮件发送成功: ${workerEmail}, MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`邮件发送失败: ${workerEmail}`, error);
      this.logger.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response,
        command: error.command
      });
      return false;
    }
  }

  // 测试邮件配置
  async testEmailConfig(): Promise<boolean> {
    try {
      const transporter = await this.createTransporter();
      const config = await this.getEmailConfig();

      // 先验证连接
      this.logger.log('验证SMTP连接...');
      await transporter.verify();
      this.logger.log('SMTP连接验证成功');

      const mailOptions = {
        from: config.from,
        to: config.from, // 发送给自己进行测试
        subject: '邮件配置测试',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>邮件配置测试</h2>
            <p>如果您收到这封邮件，说明邮件配置正确。</p>
            <p>发送时间: ${new Date().toLocaleString('zh-CN')}</p>
          </div>
        `,
      };

      this.logger.log('发送测试邮件...');
      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`测试邮件发送成功, MessageId: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('测试邮件发送失败:', error);
      this.logger.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response,
        command: error.command,
        responseCode: error.responseCode
      });
      return false;
    }
  }
}
