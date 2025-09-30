const axios = require('axios');

async function testItemCategoryAPI() {
  try {
    // 首先登录获取token
    const loginResponse = await axios.post('http://localhost:3000/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('Login successful, token:', token.substring(0, 20) + '...');
    
    // 测试获取所有分类
    const categoriesResponse = await axios.get('http://localhost:3000/item-categories', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Categories:', categoriesResponse.data);
    
    // 测试创建新分类（不提供code，让后端自动生成）
    const createResponse = await axios.post('http://localhost:3000/item-categories', {
      name: '测试分类',
      description: '这是一个测试分类',
      status: 'ACTIVE'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Created category:', createResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testItemCategoryAPI();
