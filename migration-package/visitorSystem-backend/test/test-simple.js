const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试简单的API
async function testSimpleAPI() {
  try {
    console.log('开始测试简单API...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 测试获取系统配置
    const configResponse = await axios.get(`${API_BASE_URL}/system-config`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('系统配置获取成功，配置数量:', configResponse.data.length);
    
  } catch (error) {
    console.error('简单API测试失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
  }
}

// 运行测试
async function runTests() {
  console.log('=== 简单API测试 ===\n');
  
  await testSimpleAPI();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
