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
  private lastConfigUpdateTime: Date | null = null;
  private configLoadingPromise: Promise<void> | null = null;

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

  // 获取分判商账号密码邮件模板
  private getDistributorAccountTemplate(language: string = 'zh-CN', distributorName: string, username: string, password: string, loginUrl: string) {
    let subject = '';
    let greeting = '';
    let accountInfo = '';
    let passwordInfo = '';
    let securityTip = '';
    let qrCodeTip = '';
    let footer = '';
    
    if (language === 'en-US') {
      subject = 'Worker Management System Account Information';
      greeting = `Hello, ${distributorName}:`;
      accountInfo = `Your Worker Management System account has been created. Here's your login information:`;
      passwordInfo = `Login URL: ${loginUrl}<br/>Username: ${username}<br/>Initial Password: ${password}`;
      securityTip = 'To ensure account security, please change your password after your first login.';
      qrCodeTip = 'You can login to the system to upload worker information and send QR codes to workers for entry registration.';
      footer = 'This is an automated email. Please do not reply.';
    } else if (language === 'zh-TW') {
      subject = '工人信息管理系統帳戶信息';
      greeting = `您好，${distributorName}：`;
      accountInfo = `您的工人信息管理系統帳戶已開通，以下是登錄信息：`;
      passwordInfo = `登錄鏈接：${loginUrl}<br/>帳號：${username}<br/>初始密碼：${password}`;
      securityTip = '1、為保障帳戶安全，請在首次登錄後及時修改密碼';
      qrCodeTip = '2、您可登錄系統上傳工人信息，並及時將二維碼發送給工人，用於入場登記。';
      footer = '此郵件由系統自動發送，請勿回覆。';
    } else { // zh-CN 默认
      subject = '工人信息管理系统账户信息';
      greeting = `您好，${distributorName}：`;
      accountInfo = `您的工人信息管理系统账户已开通，以下是登录信息：`;
      passwordInfo = `登录链接：${loginUrl}<br/>账号：${username}<br/>初始密码：${password}`;
      securityTip = '1、为保障账户安全，请在首次登录后及时修改密码';
      qrCodeTip = '2、您可登录系统上传工人信息，并及时将二维码发送给工人，用于入场登记。';
      footer = '此邮件由系统自动发送，请勿回复。';
    }
    
    return {
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <p style="margin-bottom: 20px; font-size: 16px;">
            ${greeting}
          </p>
          <p style="margin-bottom: 20px; line-height: 1.6;">
            ${accountInfo}
          </p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; line-height: 1.8;">
            ${passwordInfo}
          </div>
          <p style="margin-bottom: 10px; color: #d13438;">
            <strong>*温馨提示：*</strong>
          </p>
          <p style="margin-bottom: 10px;">
            ${securityTip}
          </p>
          <p style="margin-bottom: 20px;">
            ${qrCodeTip}
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
            ${footer}
          </p>
        </div>
      `
    };
  }

  // 检查邮箱配置是否需要重新加载
  private async shouldReloadEmailConfig(): Promise<boolean> {
    if (!this.lastConfigUpdateTime) {
      return true; // 首次加载
    }

    try {
      // 检查邮箱配置的更新时间（检查EMAIL_PASSWORD作为代表）
      const emailConfig = await this.systemConfigService.findByKeySafe('EMAIL_PASSWORD');
      
      if (!emailConfig) {
        this.logger.warn('未找到邮箱配置，需要重新加载');
        return true;
      }

      // 如果数据库中的更新时间晚于上次加载时间，则需要重新加载
      const dbUpdateTime = new Date(emailConfig.updated_at);
      const needsReload = dbUpdateTime > this.lastConfigUpdateTime;
      
      if (needsReload) {
        this.logger.log(`检测到邮箱配置更新，数据库时间: ${dbUpdateTime.toISOString()}, 上次加载时间: ${this.lastConfigUpdateTime.toISOString()}`);
      }
      
      return needsReload;
    } catch (error) {
      this.logger.warn('检查邮箱配置更新时间失败，强制重新加载:', error);
      return true;
    }
  }

  // 强制刷新邮箱配置
  public async refreshEmailConfig(): Promise<void> {
    this.logger.log('手动刷新邮箱配置...');
    this.lastConfigUpdateTime = null;
    this.transporter = null; // 清除transporter缓存
    this.transporterExpireTime = 0;
  }

  // 获取并校验邮件配置
  private async getEmailConfig() {
    try {
      // 检查是否需要重新加载配置
      const needsReload = await this.shouldReloadEmailConfig();
      
      if (needsReload) {
        this.logger.log('检测到邮箱配置更新，重新加载配置...');
        this.transporter = null; // 清除transporter缓存
        this.transporterExpireTime = 0;
      }

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

      // 更新配置加载时间
      this.lastConfigUpdateTime = new Date();

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

  // 发送分判商账号密码邮件（带重试）
  async sendDistributorAccountEmail(
    distributorEmail: string,
    distributorName: string,
    username: string,
    password: string,
    loginUrl: string,
    language: string = 'zh-CN',
    retryCount = 2,
  ): Promise<boolean> {
    // 详细记录函数调用参数
    this.logger.log('尝试发送分判商账号密码邮件', {
      distributorEmail,
      distributorName,
      username,
      loginUrl,
      language
    });
    
    // 校验收件人邮箱
    if (!this.validateEmail(distributorEmail)) {
      this.logger.error(`收件人邮箱格式错误：${distributorEmail}`);
      return false;
    }

    try {
      this.logger.log('获取邮件传输器...');
      const transporter = await this.getTransporter();
      
      this.logger.log('获取邮件配置...');
      const config = await this.getEmailConfig();
      this.logger.log('邮件配置获取成功', { from: this.maskEmail(config.from) });

      // 获取对应语言的邮件模板
      this.logger.log('生成邮件模板...');
      const template = this.getDistributorAccountTemplate(language, distributorName, username, password, loginUrl);
      this.logger.log('邮件模板生成成功', { subject: template.subject });
      
      // 根据语言选择系统名称
      const systemName = language === 'en-US' ? 'Worker Management System' : 
                         language === 'zh-TW' ? '工人信息管理系統' : '工人信息管理系统';
                        
      this.logger.log('准备邮件选项...');
      const mailOptions: SMTPTransport.Options = {
        from: `"${systemName}" <${config.from}>`,
        to: distributorEmail,
        subject: template.subject,
        html: template.html
      };
      
      this.logger.log('邮件发送选项准备完成', { 
        from: mailOptions.from, 
        to: this.maskEmail(distributorEmail), 
        subject: mailOptions.subject 
      });

      this.logger.log('开始发送邮件...');
      const startTime = Date.now();
      const result = await transporter.sendMail(mailOptions);
      this.logger.log(`分判商账号密码邮件发送成功 [${Date.now() - startTime}ms]：${distributorEmail}，MessageId：${result.messageId}`);
      
      // 输出完整的邮件发送结果
      this.logger.log('邮件发送完成, 返回数据:', { 
        messageId: result.messageId,
        response: result.response,
        accepted: result.accepted,
        rejected: result.rejected
      });
      
      return true;

    } catch (error) {
      // 详细记录错误信息
      this.logger.error('发送分判商账号邮件失败:', { 
        message: error.message,
        code: error.code,
        responseCode: error.responseCode,
        response: error.response?.substring(0, 500),
        stack: error.stack?.substring(0, 500),
        distributorEmail
      });
      
      // 分类错误处理
      const errorCode = error.code;
      const errorMessage = error.message || 'Unknown error';

      if (errorCode === 'ECONNREFUSED' || errorCode === 'ETIMEDOUT' || errorCode === 'ENOTFOUND') {
        this.logger.error(`邮件服务器连接失败：${errorCode} - ${errorMessage}`);
        throw new EmailConnectionError(`连接邮件服务器失败：${errorMessage}`);
      } else if (errorCode === 'EAUTH' || errorCode === 'AUTH') {
        this.logger.error(`邮件认证失败：${errorCode} - ${errorMessage}`);
        throw new EmailAuthError(`邮件认证失败：${errorMessage}`);
      } else if (retryCount > 0) {
        // 重试逻辑
        this.logger.warn(`发送邮件失败，准备重试，剩余重试次数：${retryCount}`);
        this.transporter = null; // 重置邮件发送器
        return this.sendDistributorAccountEmail(
          distributorEmail, distributorName, username, password, loginUrl, language, retryCount - 1
        );
      } else {
        this.logger.error(`邮件发送失败（重试次数用完）：${errorMessage}`);
        return false;
      }
    }
  }

  // 批量发送分判商账号密码邮件
  async batchSendDistributorAccountEmails(
    distributors: Array<{
      email: string;
      name: string;
      username: string;
      password: string;
    }>,
    loginUrl: string,
    language: string = 'zh-CN',
  ): Promise<{
    total: number;
    success: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;
    
    for (const distributor of distributors) {
      if (!distributor.email || !this.validateEmail(distributor.email)) {
        results.push({ 
          email: distributor.email || 'invalid-email', 
          success: false, 
          error: '邮箱格式无效' 
        });
        failedCount++;
        continue;
      }
      
      try {
        const success = await this.sendDistributorAccountEmail(
          distributor.email,
          distributor.name,
          distributor.username,
          distributor.password,
          loginUrl,
          language
        );
        
        if (success) {
          results.push({ email: distributor.email, success: true });
          successCount++;
        } else {
          results.push({ 
            email: distributor.email, 
            success: false, 
            error: '发送失败，请检查邮件服务配置' 
          });
          failedCount++;
        }
      } catch (error) {
        results.push({ 
          email: distributor.email, 
          success: false, 
          error: error.message || '未知错误' 
        });
        failedCount++;
        this.logger.error(`发送邮件到 ${this.maskEmail(distributor.email)} 失败: ${error.message}`);
      }
    }
    
    return {
      total: distributors.length,
      success: successCount,
      failed: failedCount,
      results
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
