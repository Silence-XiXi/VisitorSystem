import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// 加密函数
function encryptValue(value: string): string {
  // 使用固定密钥用于示例，生产环境应从环境变量获取
  const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-system-config';
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

async function main() {
  // 首先获取一个管理员用户的ID (用于updated_by字段)
  const adminUser = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (!adminUser) {
    console.error('未找到管理员用户，请先创建一个管理员用户');
    return;
  }

  const adminId = adminUser.id;

  // 系统配置项
  const configs = [
    {
      config_key: 'EMAIL_ADDRESS',
      config_value: 'notification@example.com',
      description: '发送邮箱地址',
      is_encrypted: false,
    },
    {
      config_key: 'EMAIL_HOST',
      config_value: 'smtp.example.com',
      description: '邮箱服务器 (SMTP)',
      is_encrypted: false,
    },
    {
      config_key: 'EMAIL_PORT',
      config_value: '587',
      description: '服务器端口',
      is_encrypted: false,
    },
    {
      config_key: 'EMAIL_PASSWORD',
      config_value: 'email_password_123',
      description: '邮箱密码/授权码',
      is_encrypted: true,
    },
    {
      config_key: 'WHATSAPP_SENDER_NUMBER',
      config_value: '+1234567890',
      description: 'WhatsApp发送方号码',
      is_encrypted: false,
    },
    {
      config_key: 'WHATSAPP_API_TOKEN',
      config_value: 'whatsapp_api_token_abc123',
      description: 'Business API Token',
      is_encrypted: true,
    },
    {
      config_key: 'WHATSAPP_TEMPLATE_NAME',
      config_value: 'visitor_notification',
      description: 'WhatsApp模板名称',
      is_encrypted: false,
    },
  ];

  // 插入配置
  for (const config of configs) {
    let valueToStore = config.config_value;
    
    // 如果需要加密，则加密值
    if (config.is_encrypted) {
      valueToStore = encryptValue(config.config_value);
    }
    
    // 使用upsert确保不会重复插入
    await prisma.systemConfig.upsert({
      where: {
        config_key: config.config_key,
      },
      update: {
        config_value: valueToStore,
        description: config.description,
        is_encrypted: config.is_encrypted,
        updated_by: adminId,
      },
      create: {
        config_key: config.config_key,
        config_value: valueToStore,
        description: config.description,
        is_encrypted: config.is_encrypted,
        updated_by: adminId,
      },
    });
  }

  console.log('系统配置初始化完成');
}

main()
  .catch((e) => {
    console.error('初始化系统配置时出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
