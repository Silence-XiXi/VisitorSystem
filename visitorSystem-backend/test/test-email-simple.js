const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试邮件配置
async function testEmailConfig() {
  try {
    console.log('开始测试邮件配置...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试邮件配置API
    const configResponse = await axios.post(`${API_BASE_URL}/email/test-config`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('邮件配置测试响应:', configResponse.data);
    
  } catch (error) {
    console.error('邮件配置测试失败:', error.response?.data || error.message);
  }
}

// 测试系统配置
async function testSystemConfig() {
  try {
    console.log('开始测试系统配置...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试获取邮件配置
    const configResponse = await axios.get(`${API_BASE_URL}/system-config/EMAIL_ADDRESS?decrypt=true`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('邮件地址配置:', configResponse.data);
    
  } catch (error) {
    console.error('系统配置测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('=== 邮件功能测试 ===\n');
  
  console.log('1. 测试系统配置...');
  await testSystemConfig();
  
  console.log('\n2. 测试邮件配置...');
  await testEmailConfig();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
