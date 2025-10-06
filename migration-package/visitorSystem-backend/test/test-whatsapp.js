const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 设置API基础URL
const API_URL = 'http://localhost:3000';
let token = '';

// 登录并获取token
async function login() {
  try {
    console.log('正在登录...');
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',  // 替换为有效的管理员用户名
      password: 'admin123' // 替换为有效的管理员密码
    });
    
    token = response.data.access_token;
    console.log('登录成功，获取到token');
    return token;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 生成测试QRCode图片
function generateTestQRCode() {
  // 这里可以使用已有的QR码图片，或者使用库生成一个
  // 为简单起见，我们假设已有一个测试用的QR码图片
  return path.join(__dirname, 'test_qrcode.png');
}

// 测试发送QRCode到WhatsApp
async function testSendQRCodeWhatsApp() {
  try {
    // 首先登录
    await login();
    
    // 读取测试QRCode图片并转为base64
    const qrCodePath = generateTestQRCode();
    let base64Image;
    
    try {
      const imageData = fs.readFileSync(qrCodePath);
      base64Image = `data:image/png;base64,${imageData.toString('base64')}`;
    } catch (error) {
      console.error('读取QR码图片失败:', error.message);
      console.log('使用示例base64图片数据');
      // 使用一个简单的示例base64图片数据
      base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    }
    
    console.log('发送QRCode到WhatsApp...');
    const response = await axios.post(
      `${API_URL}/whatsapp/send-qrcode`,
      {
        workerWhatsApp: '+8613512345678',  // 替换为有效的WhatsApp号码
        workerName: '测试工人',
        workerId: 'TEST001',
        qrCodeDataUrl: base64Image
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API响应:', response.data);
    
    if (response.data.success) {
      console.log('测试成功: QRCode已发送到WhatsApp');
    } else {
      console.log('测试失败:', response.data.message);
    }
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

// 执行测试
testSendQRCodeWhatsApp();
