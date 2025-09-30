const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testEmail() {
  try {
    console.log('开始测试邮件功能...');
    
    // 登录
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('登录成功');
    
    // 测试发送邮件
    const emailData = {
      workerEmail: 'test@example.com',
      workerName: '测试工人',
      workerId: 'TEST001',
      qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };
    
    console.log('发送邮件请求...');
    
    const emailResponse = await axios.post(`${API_BASE_URL}/email/send-qrcode`, emailData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('邮件发送成功:', emailResponse.data);
    
  } catch (error) {
    console.error('测试失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误信息:', error.response?.data);
    console.error('错误详情:', error.message);
  }
}

testEmail();
