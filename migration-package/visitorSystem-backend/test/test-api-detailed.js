const axios = require('axios');

async function testItemCategoryAPIDetailed() {
  try {
    console.log('=== 测试物品分类API ===');
    
    // 首先登录获取token
    console.log('\n1. 登录获取token...');
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功, token:', token.substring(0, 20) + '...');
    
    // 测试获取所有分类
    console.log('\n2. 获取所有分类...');
    const categoriesResponse = await axios.get('http://localhost:3000/item-categories', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ 获取分类成功，数量:', categoriesResponse.data.length);
    console.log('第一个分类的字段:', Object.keys(categoriesResponse.data[0] || {}));
    console.log('第一个分类数据:', JSON.stringify(categoriesResponse.data[0], null, 2));
    
    // 测试创建新分类（不提供code，让后端自动生成）
    console.log('\n3. 创建新分类（不提供code）...');
    try {
      const createResponse = await axios.post('http://localhost:3000/item-categories', {
        name: 'API测试分类_' + Date.now(),
        description: '通过API创建的测试分类',
        status: 'ACTIVE'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ 创建分类成功:', JSON.stringify(createResponse.data, null, 2));
    } catch (createError) {
      console.log('❌ 创建分类失败:');
      console.log('状态码:', createError.response?.status);
      console.log('错误信息:', createError.response?.data);
      console.log('完整错误:', createError.message);
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.response?.data || error.message);
  }
}

testItemCategoryAPIDetailed();
