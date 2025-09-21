import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import * as crypto from 'crypto';

@Injectable()
export class SystemConfigService {
  constructor(private prisma: PrismaService) {}

  // 加密配置值
  private encryptValue(value: string): string {
    // 这里应该使用环境变量或配置项中的密钥
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(encryptionKey.padEnd(32).slice(0, 32)),
      iv,
    );
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // 解密配置值
  private decryptValue(value: string): string {
    try {
      const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key';
      const [ivHex, encryptedHex] = value.split(':');
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
      console.error('解密失败:', error);
      return '解密失败';
    }
  }

  // 创建新配置
  async create(createConfigDto: CreateConfigDto, userId: string) {
    let { config_value } = createConfigDto;
    const is_encrypted = createConfigDto.is_encrypted || false;

    // 如果需要加密，对配置值进行加密
    if (is_encrypted) {
      config_value = this.encryptValue(config_value);
    }

    return this.prisma.systemConfig.create({
      data: {
        config_key: createConfigDto.config_key,
        config_value,
        description: createConfigDto.description,
        is_encrypted,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  // 查找所有配置
  async findAll() {
    const configs = await this.prisma.systemConfig.findMany();
    return configs.map((config) => ({
      ...config,
      // 如果配置是加密的，不在列表中显示解密值
      config_value: config.is_encrypted ? '[加密]' : config.config_value,
    }));
  }

  // 根据配置键查找
  async findByKey(key: string, decrypt = false) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { config_key: key },
    });

    if (!config) {
      throw new NotFoundException(`未找到配置: ${key}`);
    }

    if (config.is_encrypted && decrypt) {
      return {
        ...config,
        config_value: this.decryptValue(config.config_value),
      };
    }

    return config;
  }

  // 根据配置键查找（不抛出异常）
  async findByKeySafe(key: string, decrypt = false) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { config_key: key },
    });

    if (!config) {
      return null;
    }

    if (config.is_encrypted && decrypt) {
      return {
        ...config,
        config_value: this.decryptValue(config.config_value),
      };
    }

    return config;
  }

  // 获取配置值（便捷方法）
  async getConfigValue(key: string): Promise<string> {
    try {
      const config = await this.findByKey(key, true);
      return config.config_value;
    } catch (error) {
      return null;
    }
  }

  // 更新配置（如果不存在则创建）
  async update(key: string, updateConfigDto: UpdateConfigDto, userId: string) {
    const { config_value, description, is_encrypted } = updateConfigDto;
    
    // 尝试查找现有配置
    const config = await this.findByKeySafe(key);
    
    // 如果配置不存在，创建新配置
    if (!config) {
      return this.create({
        config_key: key,
        config_value: config_value || '',
        description: description || `系统配置: ${key}`,
        is_encrypted: is_encrypted || false
      }, userId);
    }

    // 处理配置值的更新和加密
    let updatedValue = config.config_value;
    let updatedIsEncrypted = config.is_encrypted;

    if (config_value !== undefined) {
      // 如果提供了is_encrypted，使用提供的值，否则使用现有值
      updatedIsEncrypted = is_encrypted !== undefined ? is_encrypted : config.is_encrypted;

      // 处理加密状态变化
      if (updatedIsEncrypted && !config.is_encrypted) {
        // 从不加密变为加密
        updatedValue = this.encryptValue(config_value);
      } else if (!updatedIsEncrypted && config.is_encrypted) {
        // 从加密变为不加密
        updatedValue = config_value;
      } else if (updatedIsEncrypted && config.is_encrypted) {
        // 保持加密状态
        updatedValue = this.encryptValue(config_value);
      } else {
        // 保持不加密状态
        updatedValue = config_value;
      }
    }

    return this.prisma.systemConfig.update({
      where: { config_key: key },
      data: {
        config_value: updatedValue,
        description: description !== undefined ? description : config.description,
        is_encrypted: updatedIsEncrypted,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  // 删除配置
  async remove(key: string) {
    return this.prisma.systemConfig.delete({
      where: { config_key: key },
    });
  }
}
