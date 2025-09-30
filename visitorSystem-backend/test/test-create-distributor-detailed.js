const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testCreateDistributorDetailed() {
  try {
    console.log('🧪 详细测试新增分判商功能...\n');

    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功，获得token');

    // 2. 创建新分判商
    console.log('\n2. 创建新分判商...');
    const newDistributor = {
      name: '测试分判商2',
      contactName: '李测试',
      phone: '13900139000',
      email: 'test2@example.com',
      whatsapp: '+8613900139000',
      username: 'testdistributor2',
      password: 'Test@123',
      siteIds: []
    };

    console.log('发送数据:', JSON.stringify(newDistributor, null, 2));

    try {
      const createResponse = await axios.post(`${API_BASE_URL}/admin/distributors`, newDistributor, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ 分判商创建成功:');
      console.log(JSON.stringify(createResponse.data, null, 2));

    } catch (createError) {
      console.log('❌ 创建分判商失败:');
      console.log('状态码:', createError.response?.status);
      console.log('错误信息:', createError.response?.data);
      console.log('完整错误:', createError.message);
      
      if (createError.response?.data?.message) {
        console.log('服务器错误消息:', createError.response.data.message);
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCreateDistributorDetailed();
