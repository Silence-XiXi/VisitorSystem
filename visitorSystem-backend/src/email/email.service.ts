import { Injectable, Logger } from '@nestjs/common';
import { SystemConfigService } from '../system-config/system-config.service';
import * as nodemailer from 'nodemailer';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

// 自定义异常类
export class EmailConfigError extends Error {
  constructor(message: string) {
    super(`[配置错误] ${message}`);
    this.name = 'EmailConfigError';
  }
}

export class EmailConnectionError extends Error {
  constructor(message: string) {
    super(`[连接错误] ${message}`);
    this.name = 'EmailConnectionError';
  }
}

export class EmailAuthError extends Error {
  constructor(message: string) {
    super(`[认证错误] ${message}`);
    this.name = 'EmailAuthError';
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private transporterExpireTime: number = 0;
  private readonly TRANSPORTER_TTL = 3600 * 1000; // 传输器1小时有效期

  constructor(private readonly systemConfigService: SystemConfigService) {}

  // 邮箱格式校验
  private validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // 端口合法性校验
  private validatePort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
  }

  // 邮箱地址脱敏（日志安全）
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return 'invalid-email';
    if (local.length <= 2) return `${local[0]}**@${domain}`;
    return `${local[0]}**${local.slice(-1)}@${domain}`;
  }

  // 获取并校验邮件配置
  private async getEmailConfig() {
    try {
      const [emailAddress, emailHost, emailPort, emailPassword] = await Promise.all([
        this.systemConfigService.getConfigValue('EMAIL_ADDRESS'),
        this.systemConfigService.getConfigValue('EMAIL_HOST'),
        this.systemConfigService.getConfigValue('EMAIL_PORT'),
        this.systemConfigService.getConfigValue('EMAIL_PASSWORD'),
      ]);

      // 检查配置完整性
      const missingConfig: string[] = [];
      if (!emailAddress) missingConfig.push('EMAIL_ADDRESS');
      if (!emailHost) missingConfig.push('EMAIL_HOST');
      if (!emailPort) missingConfig.push('EMAIL_PORT');
      if (!emailPassword) missingConfig.push('EMAIL_PASSWORD');
      
      if (missingConfig.length > 0) {
        throw new EmailConfigError(`缺少配置项：${missingConfig.join(', ')}`);
      }

      // 校验邮箱格式
      if (!this.validateEmail(emailAddress)) {
        throw new EmailConfigError(`邮箱格式无效：${this.maskEmail(emailAddress)}`);
      }

      // 解析并校验端口
      const port = parseInt(emailPort, 10);
      if (isNaN(port) || !this.validatePort(port)) {
        throw new EmailConfigError(`端口无效（必须是1-65535的整数）：${emailPort}`);
      }

      // 163邮箱特殊提示
      if (emailHost.includes('163.com') && !['465', '587'].includes(emailPort)) {
        this.logger.warn(`163邮箱推荐使用465或587端口，当前配置为：${emailPort}`);
      }

      return {
        from: emailAddress,
        host: emailHost,
        port,
        password: emailPassword,
      };
    } catch (error) {
      this.logger.error('获取邮件配置失败:', error.message);
      if (error instanceof EmailConfigError) {
        throw error;
      }
      throw new EmailConfigError(`配置获取异常：${error.message}`);
    }
  }

  // 创建邮件传输器
  private async createTransporter() {
    const config = await this.getEmailConfig();
    
    // 基础配置
    const transporterConfig: SMTPTransport.Options = {
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.from,
        pass: config.password,
      },
      debug: false,
      // debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development',
      connectionTimeout: 30000, // 连接超时30秒
      greetingTimeout: 15000,   // 问候超时15秒
      socketTimeout: 30000,     //  socket超时30秒
    };

    // 163邮箱特殊配置
    if (config.host.includes('163.com')) {
      transporterConfig.tls = {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
        minVersion: 'TLSv1.2', // 使用现代TLS协议
      };
      if (config.port !== 465) {
        transporterConfig.requireTLS = true;
      }
    } 
    // 其他邮箱TLS配置
    else if (config.port !== 465) {
      transporterConfig.requireTLS = true;
      transporterConfig.tls = {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      };
    }

    this.logger.log('邮件传输器配置:', {
      host: config.host,
      port: config.port,
      secure: transporterConfig.secure,
      user: this.maskEmail(config.from),
      environment: process.env.NODE_ENV || 'development',
    });
    
    return nodemailer.createTransport(transporterConfig);
  }

  // 获取传输器（使用缓存）
  private async getTransporter() {
    // 检查缓存是否有效
    if (this.transporter && Date.now() < this.transporterExpireTime) {
      try {
        await this.transporter.verify();
        return this.transporter;
      } catch (error) {
        this.logger.warn('缓存的传输器连接无效，将重新创建');
      }
    }

    // 创建新传输器并更新缓存
    this.transporter = await this.createTransporter();
    this.transporterExpireTime = Date.now() + this.TRANSPORTER_TTL;
    return this.transporter;
  }

  // 多语言邮件模板
  private getEmailTemplate(language: string = 'zh-CN', workerName: string, workerId: string) {
    // 默认为中文模板
    let subject = `工人二维码 - ${workerName} (${workerId})`;
    let title = '工人二维码';
    let greeting = `尊敬的 ${workerName}，`;
    let message = '您的工人二维码已生成，请查收附件中的二维码图片。';
    let infoTitle = '工人信息';
    let nameLable = '姓名:';
    let workerIdLabel = '工人编号:';
    let instruction = '请妥善保管此二维码，用于访客系统签到。';
    let footer = '此邮件由系统自动发送，请勿回复。';

    // 根据语言选择不同的模板文本
    if (language === 'en-US') {
      subject = `Worker QR Code - ${workerName} (${workerId})`;
      title = 'Worker QR Code';
      greeting = `Dear ${workerName},`;
      message = 'Your worker QR code has been generated. Please check the QR code image in the attachment.';
      infoTitle = 'Worker Information';
      nameLable = 'Name:';
      workerIdLabel = 'Worker ID:';
      instruction = 'Please keep this QR code safe for visitor system check-in.';
      footer = 'This email is sent automatically by the system. Please do not reply.';
    } else if (language === 'zh-TW') {
      subject = `工人二維碼 - ${workerName} (${workerId})`;
      title = '工人二維碼';
      greeting = `尊敬的 ${workerName}，`;
      message = '您的工人二維碼已生成，請查收附件中的二維碼圖片。';
      infoTitle = '工人信息';
      nameLable = '姓名:';
      workerIdLabel = '工人編號:';
      instruction = '請妥善保管此二維碼，用於訪客系統簽到。';
      footer = '此郵件由系統自動發送，請勿回復。';
    }

    return {
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${greeting}</p>
          <p>${message}</p>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${infoTitle}</h3>
            <p><strong>${nameLable}</strong> ${workerName}</p>
            <p><strong>${workerIdLabel}</strong> ${workerId}</p>
          </div>
          <p>${instruction}</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            ${footer}
          </p>
        </div>
      `
    };
  }

  // 发送工人二维码邮件（带重试）
  async sendWorkerQRCodeEmail(
    workerEmail: string,
    workerName: string,
    workerId: string,
    qrCodeDataUrl: string,
    language: string = 'zh-CN', // 添加语言参数
    retryCount = 2,
  ): Promise<boolean> {
    // 校验收件人邮箱
    if (!this.validateEmail(workerEmail)) {
      this.logger.error(`收件人邮箱格式错误：${workerEmail}`);
      return false;
    }

    // 校验二维码数据
    if (!qrCodeDataUrl?.startsWith('data:image/png;base64,')) {
      this.logger.error(`无效的二维码数据：${workerId}-${workerName}`);
      return false;
    }

    try {
      const transporter = await this.getTransporter();
      const config = await this.getEmailConfig();

      // 处理二维码附件
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // 获取对应语言的邮件模板
      const template = this.getEmailTemplate(language, workerName, workerId);
      
      // 根据语言选择系统名称
      const systemName = language === 'en-US' ? 'Visitor System' : 
                        language === 'zh-TW' ? '訪客系統' : '访客系统';
                        
      const mailOptions: SMTPTransport.Options = {
        from: `"${systemName}" <${config.from}>`,
        to: workerEmail,
        subject: template.subject,
        html: template.html,
        attachments: [
          {
            filename: `${workerName}_${workerId}_qrcode.png`,
            content: buffer,
            contentType: 'image/png',
          },
        ],
      };

      const startTime = Date.now();
      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`邮件发送成功 [${Date.now() - startTime}ms]：${workerEmail}，MessageId：${result.messageId}`);
      return true;

    } catch (error) {
      // 分类错误处理
      const errorCode = error.code;
      const errorMsg = error.message || '未知错误';

      // 连接类错误且有重试次数时进行重试
      if (retryCount > 0 && ['ESOCKET', 'ETIMEDOUT', 'ECONNRESET'].includes(errorCode)) {
        const remaining = retryCount - 1;
        this.logger.warn(`邮件发送失败，将重试（剩余${remaining}次）：${workerEmail}，原因：${errorMsg}`);
        await new Promise(resolve => setTimeout(resolve, (3 - retryCount) * 1000)); // 指数退避
        return this.sendWorkerQRCodeEmail(workerEmail, workerName, workerId, qrCodeDataUrl, language, remaining);
      }

      // 记录不同类型错误的详细信息
      if (error instanceof EmailConfigError) {
        this.logger.error(`配置错误导致发送失败：${workerEmail}，${errorMsg}`);
      } else if (errorCode === 'EAUTH') {
        const emailConfig = await this.getEmailConfig();
        this.logger.error(`认证失败导致发送失败：${this.maskEmail(emailConfig.from)} → ${workerEmail}`, {
          response: error.response?.substring(0, 200)
        });
        throw new EmailAuthError(`账号或授权码错误：${errorMsg}`);
      } else if (['ESOCKET', 'ETIMEDOUT'].includes(errorCode)) {
        const emailConfig = await this.getEmailConfig();
        this.logger.error(`连接失败导致发送失败：${emailConfig.host}:${emailConfig.port} → ${workerEmail}`, {
          code: errorCode,
          address: error.address,
          port: error.port
        });
        throw new EmailConnectionError(`网络连接异常：${errorMsg}`);
      } else {
        this.logger.error(`邮件发送失败：${workerEmail}`, {
          message: errorMsg,
          code: errorCode,
          response: error.response?.substring(0, 200),
          command: error.command
        });
      }

      return false;
    }
  }

  // 测试邮件配置
  async testEmailConfig(): Promise<boolean> {
    try {
      const transporter = await this.getTransporter();
      const config = await this.getEmailConfig();

      this.logger.log('验证SMTP连接...');
      const verifyStart = Date.now();
      await transporter.verify();
      this.logger.log(`SMTP连接验证成功 [${Date.now() - verifyStart}ms]`);

      const mailOptions: SMTPTransport.Options = {
        from: `"系统测试" <${config.from}>`,
        to: config.from,
        subject: `[${process.env.NODE_ENV || 'development'}] 邮件配置测试`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>邮件配置测试成功</h2>
            <p><strong>测试时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
            <p><strong>运行环境：</strong>${process.env.NODE_ENV || 'development'}</p>
            <p><strong>SMTP配置：</strong>${config.host}:${config.port}（${config.port === 465 ? 'SSL' : 'STARTTLS'}）</p>
            <p><strong>发件人账号：</strong>${this.maskEmail(config.from)}</p>
          </div>
        `,
      };

      this.logger.log('发送测试邮件...');
      const sendStart = Date.now();
      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`测试邮件发送成功 [${Date.now() - sendStart}ms]，MessageId：${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('测试邮件配置失败:', {
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response?.substring(0, 200)
      });
      return false;
    }
  }
}
