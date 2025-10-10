import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigService } from '@nestjs/config';
import { promisify } from 'util';
import { firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';
import { PrismaService } from '../prisma/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
// 直接导入axios作为备选HTTP客户端
import axios from 'axios';
// 导入用于解密的crypto模块
import * as crypto from 'crypto';

// 工人二维码数据类型
interface WorkerQRCodeData {
  workerWhatsApp: string;
  workerName: string;
  workerId: string;
  qrCodeDataUrl: string;
}

// 批量发送结果类型
interface BatchSendResult {
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
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  // 直接使用测试脚本中验证过的有效API密钥
  private apiKey: string = ''; // 这是测试中使用的有效API密钥
  private fromPhoneNumber: string = '';
  private configLoaded = false;
  private configLoadingPromise: Promise<void> | null = null;
  private lastConfigUpdateTime: Date | null = null;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prismaService: PrismaService,
    private systemConfigService: SystemConfigService
  ) {}

  /**
   * 确保配置已加载（延迟初始化）
   * 如果配置未加载，则立即加载
   * 如果配置已过期，则重新加载
   */
  private async ensureConfigLoaded(): Promise<void> {
    // 检查是否需要重新加载配置
    const needsReload = await this.shouldReloadConfig();
    
    if (this.configLoaded && !needsReload) {
      this.logger.debug('配置已加载且未过期，跳过重新加载');
      return;
    }

    // 如果正在加载中，等待加载完成
    if (this.configLoadingPromise) {
      this.logger.debug('配置正在加载中，等待完成...');
      await this.configLoadingPromise;
      return;
    }

    // 开始加载配置
    this.logger.log('开始加载WhatsApp配置...');
    this.configLoadingPromise = this.loadConfigFromDatabase();
    await this.configLoadingPromise;
    this.configLoaded = true;
    this.configLoadingPromise = null;
    this.lastConfigUpdateTime = new Date();
    this.logger.log('配置加载完成');
  }

  /**
   * 检查是否需要重新加载配置
   * 通过比较数据库中的更新时间来判断
   */
  private async shouldReloadConfig(): Promise<boolean> {
    if (!this.configLoaded || !this.lastConfigUpdateTime) {
      return true; // 首次加载
    }

    try {
      // 检查API密钥配置的更新时间
      const apiKeyConfig = await this.prismaService.systemConfig.findUnique({
        where: { config_key: 'WHATSAPP_API_TOKEN' },
        select: { updated_at: true }
      });

      if (!apiKeyConfig) {
        this.logger.warn('未找到API密钥配置，需要重新加载');
        return true;
      }

      // 如果数据库中的更新时间晚于上次加载时间，则需要重新加载
      const dbUpdateTime = new Date(apiKeyConfig.updated_at);
      const needsReload = dbUpdateTime > this.lastConfigUpdateTime;
      
      if (needsReload) {
        this.logger.log(`检测到配置更新，数据库时间: ${dbUpdateTime.toISOString()}, 上次加载时间: ${this.lastConfigUpdateTime.toISOString()}`);
      }
      
      return needsReload;
    } catch (error) {
      this.logger.warn('检查配置更新时间失败，强制重新加载:', error);
      return true;
    }
  }

  /**
   * 强制刷新配置
   * 用于手动触发配置重新加载
   */
  public async refreshConfig(): Promise<void> {
    this.logger.log('手动刷新WhatsApp配置...');
    this.configLoaded = false;
    this.lastConfigUpdateTime = null;
    await this.ensureConfigLoaded();
  }

  /**
   * 解密加密值
   * @param encryptedValue 格式为"iv:encryptedData"的加密值
   * @returns 解密后的值
   */
  private decryptValue(encryptedValue: string): string {
    try {
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key';
      const [ivHex, encryptedHex] = encryptedValue.split(':');
      
      if (!ivHex || !encryptedHex) {
        this.logger.warn('加密值格式无效，无法解密');
        return null;
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey.padEnd(32).slice(0, 32)),
        iv,
      );
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('解密失败:', error.message);
      return null;
    }
  }

  /**
   * 从数据库加载YCloud和WhatsApp配置
   */
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      this.logger.log('延迟加载WhatsApp配置...');
      
      // 使用SystemConfigService获取并自动解密配置
      try {
        const apiKeyValue = await this.systemConfigService.getConfigValue('WHATSAPP_API_TOKEN');
        if (apiKeyValue) {
          this.logger.log('成功从SystemConfigService获取API密钥');
          this.apiKey = apiKeyValue;
          this.logger.log(`API密钥长度: ${this.apiKey.length}`);
        } else {
          this.logger.warn('SystemConfigService返回的API密钥为空');
        }
      } catch (e) {
        this.logger.warn('无法从SystemConfigService获取API密钥，尝试直接从数据库获取', e);
        
        // 备选方案：直接从数据库获取并手动解密
        const apiKeyConfig = await this.prismaService.systemConfig.findUnique({
          where: { config_key: 'WHATSAPP_API_TOKEN' }
        });
        
        if (apiKeyConfig) {
          this.logger.debug(`数据库中API密钥是否加密: ${apiKeyConfig.is_encrypted}`);
          
          if (apiKeyConfig.is_encrypted) {
            // 尝试解密
            const decryptedKey = this.decryptValue(apiKeyConfig.config_value);
            if (decryptedKey) {
              this.logger.log('成功解密API密钥');
              this.apiKey = decryptedKey;
            } else {
              this.logger.warn('API密钥解密失败');
            }
          } else {
            this.apiKey = apiKeyConfig.config_value;
            this.logger.log('从数据库加载了未加密的API密钥');
          }
        } else {
          this.logger.warn('数据库中未找到WHATSAPP_API_TOKEN配置');
        }
      }
      
      // 获取发送方号码
      try {
        const phoneNumber = await this.systemConfigService.getConfigValue('WHATSAPP_SENDER_NUMBER');
        if (phoneNumber) {
          this.fromPhoneNumber = phoneNumber;
          this.logger.log('成功从SystemConfigService获取发送方号码');
        }
      } catch (e) {
        this.logger.warn('无法从SystemConfigService获取发送方号码，尝试直接从数据库获取');
        
        const senderNumberConfig = await this.prismaService.systemConfig.findUnique({
          where: { config_key: 'WHATSAPP_SENDER_NUMBER' }
        });

        if (senderNumberConfig && senderNumberConfig.config_value) {
          this.fromPhoneNumber = senderNumberConfig.config_value;
          this.logger.log('从数据库加载了WhatsApp发送方号码');
        } else {
          this.logger.log('使用默认发送方号码');
        }
      }

      // 验证最终配置结果
      this.logger.log(`延迟加载完成 - API密钥状态: ${this.apiKey ? '已配置' : '未配置'}`);
      if (this.apiKey) {
        this.logger.log(`API密钥长度: ${this.apiKey.length}`);
        this.logger.log(`API密钥前四位: ${this.apiKey.substring(0, 4)}...`);
      }
      this.logger.log(`发送方号码: ${this.fromPhoneNumber}`);
    } catch (error) {
      this.logger.error('延迟加载WhatsApp配置失败:', error);
      // 保留默认值，不要覆盖
    }
  }

  /**
   * 将base64图片数据保存为临时文件
   * @param base64Data Base64格式的图片数据
   * @returns 临时文件路径
   */
  private async saveBase64ImageToTempFile(base64Data: string): Promise<string> {
    try {
      // 去掉base64编码的前缀（如果有的话）
      const base64Image = base64Data.split(';base64,').pop();
      if (!base64Image) {
        throw new Error('Invalid base64 image data');
      }

      // 创建临时文件
      const tempDir = os.tmpdir();
      const tempFileName = `qrcode_${Date.now()}.png`;
      const tempFilePath = path.join(tempDir, tempFileName);
      
      // 将base64数据写入临时文件
      const writeFileAsync = promisify(fs.writeFile);
      await writeFileAsync(tempFilePath, Buffer.from(base64Image, 'base64'));
      
      return tempFilePath;
    } catch (error) {
      this.logger.error(`Error saving base64 image: ${error.message}`, error.stack);
      throw new Error(`Failed to save base64 image: ${error.message}`);
    }
  }

  /**
   * 上传媒体文件到YCloud
   * @param filePath 文件路径
   * @returns 媒体ID
   */
  private async uploadMediaToYCloud(filePath: string): Promise<string> {
    try {
      // 确保配置已加载
      await this.ensureConfigLoaded();
      
      // 直接使用axios而不是HttpService，完全复制测试脚本的行为
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      const url = `https://api.ycloud.com/v2/whatsapp/media/${this.fromPhoneNumber}/upload`;
      
      this.logger.log(`上传到 URL: ${url}`);
      this.logger.log(`使用API密钥: ${this.apiKey}`); // 记录完整密钥以便调试
      
      // 使用直接的axios调用，与测试脚本完全一致
      const response = await axios({
        method: 'post',
        url: url,
        headers: {
          'X-API-Key': this.apiKey,
          ...formData.getHeaders()
        },
        data: formData
      });
      
      this.logger.log(`YCloud响应状态: ${response.status}`);
      this.logger.debug(`YCloud响应数据: ${JSON.stringify(response.data)}`);
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from YCloud media upload API: No ID returned');
      }
      
      return response.data.id;
    } catch (error) {
      // 提供更详细的错误信息
      const errorDetails = error.response?.data ? JSON.stringify(error.response.data) : 'No response data';
      const errorStatus = error.response?.status || 'Unknown';
      
      this.logger.error(`Error uploading media to YCloud: Status ${errorStatus}, Details: ${errorDetails}`);
      throw new Error(`Failed to upload media to YCloud: ${error.message}`);
    }
  }

  /**
   * 发送QRCode到WhatsApp
   * @param toPhoneNumber 接收方手机号
   * @param workerName 工人姓名
   * @param mediaId YCloud媒体ID
   * @returns 发送结果
   */
  private async sendWhatsAppMessage(toPhoneNumber: string, workerName: string, mediaId: string, language?: string): Promise<any> {
    try {
      // 确保配置已加载
      await this.ensureConfigLoaded();
      
      const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
      
      // 获取当前系统语言
      let languageCode = 'zh_HK';
      let templateSuffix = '_tw';
      
      // 根据请求中传递的语言参数设置语言代码和模板后缀
      if (language) {
        if (language === 'zh-CN') {
          languageCode = 'zh_CN';
          templateSuffix = '_cn';
        } else if (language === 'en-US') {
          languageCode = 'en';
          templateSuffix = '_en';
        } else if (language === 'zh-TW') {
          languageCode = 'zh_HK';
          templateSuffix = '_tw';
        }
        this.logger.log(`使用请求中指定的语言: ${language}`);
      } else {
        // 如果没有指定语言，使用默认语言（繁体中文）
        this.logger.log('未指定语言，使用默认语言（繁体中文）');
      }
      
      // 从系统配置获取WhatsApp模板名称基础部分
      const templateBase = await this.systemConfigService.getConfigValue('WHATSAPP_TEMPLATE_NAME') || 'worker_qrcode_tw';
      // 由于默认模板名称已经包含后缀，如果使用默认值则不需要再添加后缀
      const templateName = templateBase === 'worker_qrcode_tw' ? templateBase : templateBase + templateSuffix;
      
      this.logger.log(`使用WhatsApp模板: ${templateName}, 语言: ${languageCode}`);
      
      const payload = {
        type: 'template',
        template: {
          language: { code: languageCode },
          name: templateName,
          components: [
            { type: 'header', parameters: [{ image: { id: mediaId }, type: 'image' }] },
            { type: 'body', parameters: [{ type: 'text', text: workerName }] }
          ]
        },
        to: toPhoneNumber,
        from: this.fromPhoneNumber
      };
      
      this.logger.log(`发送WhatsApp消息，使用mediaId: ${mediaId}`);
      
      // 同样使用axios直接调用
      const response = await axios({
        method: 'post',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        data: payload
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message: ${error.message}`, error.stack);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * 发送QRCode到工人的WhatsApp
   * @param workerWhatsApp 工人WhatsApp号码
   * @param workerName 工人姓名
   * @param qrCodeDataUrl QRCode的DataURL
   * @returns 发送结果
   */
  async sendQRCode(workerWhatsApp: string, workerName: string, qrCodeDataUrl: string, language?: string): Promise<{ success: boolean; message: string }> {
    try {
      // 延迟初始化：确保配置已加载
      this.logger.log('开始发送QRCode，检查配置状态...');
      await this.ensureConfigLoaded();
      
      // 验证API密钥有效性
      if (!this.apiKey) {
        this.logger.error('API密钥未配置，无法发送WhatsApp消息');
        return { 
          success: false, 
          message: '发送失败: API密钥未配置' 
        };
      }
      
      // 记录API密钥信息以便调试
      this.logger.log(`API密钥长度: ${this.apiKey.length}`);
      this.logger.log(`API密钥前四位: ${this.apiKey.substring(0, 4)}`);
      this.logger.log(`API密钥后四位: ${this.apiKey.substring(this.apiKey.length - 4)}`);
      // 检查是否有不可见字符
      const containsInvisible = /[\u0000-\u001F\u007F-\u009F\s]/.test(this.apiKey);
      if (containsInvisible) {
        this.logger.warn('API密钥包含不可见字符，可能导致认证问题');
      }
      
      // 验证WhatsApp号码格式
      if (!workerWhatsApp.startsWith('+')) {
        workerWhatsApp = `+${workerWhatsApp}`;
      }
      
      // 1. 将base64图片保存为临时文件
      const tempFilePath = await this.saveBase64ImageToTempFile(qrCodeDataUrl);
      this.logger.log(`QRCode已保存为临时文件: ${tempFilePath}`);
      
      try {
        // 2. 上传媒体文件到YCloud
        const mediaId = await this.uploadMediaToYCloud(tempFilePath);
        this.logger.log(`媒体文件已上传到YCloud, media ID: ${mediaId}`);
        
        // 3. 发送WhatsApp消息
        const result = await this.sendWhatsAppMessage(workerWhatsApp, workerName, mediaId, language);
        this.logger.log(`WhatsApp消息已发送: ${JSON.stringify(result)}`);
        
        return { 
          success: true, 
          message: `QRCode已成功发送到WhatsApp: ${workerWhatsApp}` 
        };
      } finally {
        // 清理临时文件
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          this.logger.log(`临时文件已删除: ${tempFilePath}`);
        }
      }
    }     catch (error) {
      // 提供更详细的错误信息，特别是API响应
      const errorDetails = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      const errorStatus = error.response?.status || 'Unknown';
      
      this.logger.error(`发送QRCode到WhatsApp失败: Status ${errorStatus}, Details: ${errorDetails}`);
      
      return { 
        success: false, 
        message: `发送失败: API状态码 ${errorStatus}, ${errorDetails}` 
      };
    }
  }
  
  /**
   * 批量发送QRCode到多个工人WhatsApp
   * @param workers 工人WhatsApp及二维码数据数组
   * @param language 语言选项
   * @returns 批量发送结果
   */
  async batchSendQRCode(
    workers: WorkerQRCodeData[],
    language?: string
  ): Promise<BatchSendResult> {
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

    // 检查是否有工人数据
    if (!workers || workers.length === 0) {
      return {
        success: false,
        message: '没有提供有效的工人数据'
      };
    }

    // 遍历每个工人并发送二维码
    for (const worker of workers) {
      try {
        // 发送单个二维码
        const result = await this.sendQRCode(
          worker.workerWhatsApp,
          worker.workerName,
          worker.qrCodeDataUrl,
          language
        );

        // 添加到结果列表
        results.details.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          success: result.success,
          message: result.success ? undefined : result.message
        });

        // 累加成功或失败数量
        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
        }
      } catch (error) {
        this.logger.error(`向工人 ${worker.workerName}(${worker.workerId}) 发送WhatsApp失败:`, error);
        
        // 添加错误到结果列表
        results.details.push({
          workerId: worker.workerId,
          workerName: worker.workerName,
          success: false,
          message: error instanceof Error ? error.message : '未知错误'
        });
        
        results.failed++;
      }
    }

    // 返回汇总结果
    return {
      success: true,
      message: `已处理 ${results.total} 个工人，成功 ${results.succeeded} 个，失败 ${results.failed} 个`,
      results
    };
  }
}