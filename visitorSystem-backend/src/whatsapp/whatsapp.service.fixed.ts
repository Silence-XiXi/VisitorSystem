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

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  // 使用你的测试脚本中的有效值作为默认值
  private apiKey: string = '1e673379256fe1b0385c97d8120fbb30';
  private fromPhoneNumber: string = '+85261606103';
  private configLoaded = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prismaService: PrismaService
  ) {}

  // NestJS生命周期钩子，确保服务初始化完成后才可用
  async onModuleInit() {
    await this.loadConfigFromDatabase();
    this.configLoaded = true;
  }

  /**
   * 从数据库加载YCloud和WhatsApp配置
   */
  private async loadConfigFromDatabase(): Promise<void> {
    try {
      this.logger.log('从数据库加载WhatsApp配置...');
      
      // 获取API Key
      const apiKeyConfig = await this.prismaService.systemConfig.findUnique({
        where: { config_key: 'WHATSAPP_API_TOKEN' }
      });

      // 获取发送方号码
      const senderNumberConfig = await this.prismaService.systemConfig.findUnique({
        where: { config_key: 'WHATSAPP_SENDER_NUMBER' }
      });

      // 不要覆盖默认的有效值，除非从数据库中找到了设置
      if (apiKeyConfig && apiKeyConfig.config_value) {
        this.apiKey = apiKeyConfig.config_value;
        this.logger.log('从数据库加载了WhatsApp API密钥');
      } else {
        this.logger.log('使用默认API密钥');
      }

      if (senderNumberConfig && senderNumberConfig.config_value) {
        this.fromPhoneNumber = senderNumberConfig.config_value;
        this.logger.log('从数据库加载了WhatsApp发送方号码');
      } else {
        this.logger.log('使用默认发送方号码');
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
      // 使用直接匹配测试脚本的方式
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      
      const url = `https://api.ycloud.com/v2/whatsapp/media/${this.fromPhoneNumber}/upload`;
      
      this.logger.debug(`上传到 URL: ${url}`);
      this.logger.debug(`使用API密钥: ${this.apiKey.substring(0, 4)}...`);
      
      // 与测试脚本保持一致的请求方式
      const response = await firstValueFrom(this.httpService.post(url, formData, {
        headers: {
          'X-API-Key': this.apiKey,
          ...formData.getHeaders()
        }
      }));
      
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
      
      const response = await firstValueFrom(this.httpService.post(url, payload, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        }
      }));
      
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
    } catch (error) {
      this.logger.error(`发送QRCode到WhatsApp失败: ${error.message}`, error.stack);
      return { 
        success: false, 
        message: `发送失败: ${error.message}` 
      };
    }
  }
}
