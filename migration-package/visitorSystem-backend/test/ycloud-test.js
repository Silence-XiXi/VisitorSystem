const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// 替换为您的实际API密钥
const API_KEY = '1e673379256fe1b0385c97d8120fbb30';
// 替换为您的WhatsApp发送号码
const PHONE_NUMBER = '+85261606103';

async function testYCloudAPI() {
  try {
    console.log('开始测试YCloud API连接...');
    
    // 读取QR码图片
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test_qrcode.png'));
    
    console.log('上传图片到YCloud...');
    const uploadResult = await axios({
      method: 'post',
      url: `https://api.ycloud.com/v2/whatsapp/media/${PHONE_NUMBER}/upload`,
      headers: {
        'X-API-Key': API_KEY,
        ...formData.getHeaders()
      },
      data: formData
    });
    
    console.log('上传成功，媒体ID:', uploadResult.data);
    
    // 如果需要，可以测试发送消息
    // const mediaId = uploadResult.data.id;
    // 测试发送...
    
  } catch (error) {
    console.error('测试失败:');
    console.error('状态码:', error.response?.status);
    console.error('错误详情:', error.response?.data || error.message);
  }
}

testYCloudAPI();