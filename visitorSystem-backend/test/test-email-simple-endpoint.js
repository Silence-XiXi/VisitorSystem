const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试简单的邮件端点
async function testSimpleEndpoint() {
  try {
    console.log('开始测试简单邮件端点...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试简单的GET端点
    const simpleResponse = await axios.get(`${API_BASE_URL}/email/test-simple`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('简单端点测试响应:', simpleResponse.data);
    
  } catch (error) {
    console.error('简单端点测试失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
  }
}

// 运行测试
async function runTests() {
  console.log('=== 简单邮件端点测试 ===\n');
  
  await testSimpleEndpoint();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
