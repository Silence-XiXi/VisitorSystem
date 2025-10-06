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
    
    for (const configKey of configs) {
      try {
        const configResponse = await axios.get(`${API_BASE_URL}/system-config/${configKey}?decrypt=true`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`${configKey}:`, configResponse.data.config_value ? '已配置' : '未配置');
      } catch (error) {
        console.log(`${configKey}: 配置获取失败 -`, error.response?.data?.message || error.message);
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('=== 邮件配置测试 ===\n');
  
  await testAllEmailConfigs();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
