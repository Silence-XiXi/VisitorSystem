const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试邮件发送功能
async function testEmailAPI() {
  try {
    console.log('开始测试邮件发送API...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试发送邮件API
    const emailData = {
      workerEmail: 'test@example.com',
      workerName: '测试工人',
      workerId: 'TEST001',
      qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };
    
    console.log('发送邮件请求数据:', emailData);
    
    const emailResponse = await axios.post(`${API_BASE_URL}/email/send-qrcode`, emailData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('邮件发送响应:', emailResponse.data);
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

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

// 运行测试
async function runTests() {
  console.log('=== 邮件功能测试 ===\n');
  
  console.log('1. 测试邮件配置...');
  await testEmailConfig();
  
  console.log('\n2. 测试发送邮件...');
  await testEmailAPI();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
