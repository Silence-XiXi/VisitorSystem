const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testEmailConfig() {
  try {
    console.log('开始测试邮件配置...');
    
    // 登录
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功');
    
    // 测试邮件配置
    console.log('测试邮件配置...');
    
    const configResponse = await axios.post(`${API_BASE_URL}/email/test-config`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('邮件配置测试成功:', configResponse.data);
    
  } catch (error) {
    console.error('邮件配置测试失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
    console.error('错误详情:', error.message);
  }
}

testEmailConfig();
