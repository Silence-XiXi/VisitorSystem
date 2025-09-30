const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试所有邮件配置
async function testAllEmailConfigs() {
  try {
    console.log('开始测试所有邮件配置...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试获取所有邮件相关配置
    const configs = [
      'EMAIL_ADDRESS',
      'EMAIL_HOST', 
      'EMAIL_PORT',
      'EMAIL_PASSWORD'
    ];
    
    const configValues = {};
    
    for (const configKey of configs) {
      try {
        const configResponse = await axios.get(`${API_BASE_URL}/system-config/${configKey}?decrypt=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        configValues[configKey] = configResponse.data.config_value;
        console.log(`${configKey}:`, configResponse.data.config_value ? '已配置' : '未配置');
        if (configKey === 'EMAIL_PASSWORD') {
          console.log(`${configKey} 值:`, configResponse.data.config_value ? '***' : '未配置');
        } else {
          console.log(`${configKey} 值:`, configResponse.data.config_value);
        }
      } catch (error) {
        console.log(`${configKey}: 配置获取失败 -`, error.response?.data?.message || error.message);
      }
    }
    
    return configValues;
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    return null;
  }
}

// 测试SMTP连接
async function testSMTPConnection(configValues) {
  try {
    console.log('\n开始测试SMTP连接...');
    
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: configValues.EMAIL_HOST,
      port: parseInt(configValues.EMAIL_PORT),
      secure: parseInt(configValues.EMAIL_PORT) === 465,
      auth: {
        user: configValues.EMAIL_ADDRESS,
        pass: configValues.EMAIL_PASSWORD,
      },
    });
    
    // 验证连接
    await transporter.verify();
    console.log('SMTP连接验证成功');
    
    // 尝试发送测试邮件
    const testMailOptions = {
      from: configValues.EMAIL_ADDRESS,
      to: configValues.EMAIL_ADDRESS, // 发送给自己
      subject: 'SMTP连接测试',
      html: '<p>如果您收到这封邮件，说明SMTP配置正确。</p>',
    };
    
    const result = await transporter.sendMail(testMailOptions);
    console.log('测试邮件发送成功, MessageId:', result.messageId);
    
    return true;
    
  } catch (error) {
    console.error('SMTP连接测试失败:', error.message);
    return false;
  }
}

// 运行测试
async function runTests() {
  console.log('=== 邮件配置详细测试 ===\n');
  
  const configValues = await testAllEmailConfigs();
  
  if (configValues) {
    await testSMTPConnection(configValues);
  }
  
  console.log('\n=== 测试完成 ===');
}

runTests();
