const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// 测试邮件密码配置
async function testEmailPassword() {
  try {
    console.log('开始测试邮件密码配置...');
    
    // 首先需要登录获取token
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功，获取到token');
    
    // 获取邮件密码配置
    const configResponse = await axios.get(`${API_BASE_URL}/system-config/EMAIL_PASSWORD?decrypt=true`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const password = configResponse.data.config_value;
    console.log('邮件密码长度:', password ? password.length : 0);
    console.log('邮件密码前3位:', password ? password.substring(0, 3) : '无');
    console.log('邮件密码后3位:', password ? password.substring(password.length - 3) : '无');
    
    // 检查是否是授权码格式（通常16位字符）
    if (password && password.length === 16) {
      console.log('密码格式看起来像授权码');
    } else if (password && password.length > 16) {
      console.log('密码长度较长，可能是普通密码');
    } else {
      console.log('密码长度异常');
    }
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('=== 邮件密码配置测试 ===\n');
  
  await testEmailPassword();
  
  console.log('\n=== 测试完成 ===');
}

runTests();
