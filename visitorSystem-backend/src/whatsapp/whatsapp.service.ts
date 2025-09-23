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

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  // 直接使用测试脚本中验证过的有效API密钥
  private apiKey: string = ''; // 这是测试中使用的有效API密钥
  private fromPhoneNumber: string = '';
  private configLoaded = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prismaService: PrismaService,
    private systemConfigService: SystemConfigService
  ) {}

  // NestJS生命周期钩子，确保服务初始化完成后才可用
  async onModuleInit() {
    await this.loadConfigFromDatabase();
    this.configLoaded = true;
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
      this.logger.log('从数据库加载WhatsApp配置...');
      
      // 使用SystemConfigService获取并自动解密配置
      try {
        const apiKeyValue = await this.systemConfigService.getConfigValue('WHATSAPP_API_TOKEN');
        if (apiKeyValue) {
          this.logger.log('成功从SystemConfigService获取API密钥');
          this.apiKey = apiKeyValue;
        }
      } catch (e) {
        this.logger.warn('无法从SystemConfigService获取API密钥，尝试直接从数据库获取');
        
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
              this.logger.warn('API密钥解密失败，使用默认密钥');
              // 保留默认值
            }
          } else {
            this.apiKey = apiKeyConfig.config_value;
            this.logger.log('从数据库加载了未加密的API密钥');
          }
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

      // 验证配置
      this.logger.log(`当前API密钥: ${this.apiKey.substring(0, 4)}...`);
      this.logger.log(`当前发送方号码: ${this.fromPhoneNumber}`);
    } catch (error) {
      this.logger.error('加载WhatsApp配置失败，使用默认配置:', error);
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
  private async sendWhatsAppMessage(toPhoneNumber: string, workerName: string, mediaId: string): Promise<any> {
    try {
      const url = 'https://api.ycloud.com/v2/whatsapp/messages/sendDirectly';
      const payload = {
        type: 'template',
        template: {
          language: { code: 'zh_HK' },
          name: 'worker_qrcode_tw',
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
  async sendQRCode(workerWhatsApp: string, workerName: string, qrCodeDataUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      // 确保配置已加载
      if (!this.configLoaded) {
        this.logger.warn('配置尚未完全加载，正在使用默认配置');
      }
      
      // 验证API密钥有效性
      if (!this.apiKey) {
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
        const result = await this.sendWhatsAppMessage(workerWhatsApp, workerName, mediaId);
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
}
