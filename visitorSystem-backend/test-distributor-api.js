const axios = require('axios');

async function testDistributorAPI() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('🧪 测试分判商API集成...\n');
    
    // 1. 登录
    console.log('1. 分判商登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'bjadmin',
      password: 'distributor123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功');
    console.log(`   用户名: ${loginResponse.data.user.username}`);
    console.log(`   角色: ${loginResponse.data.user.role}`);
    
    // 2. 获取用户资料（包含分判商信息）
    console.log('\n2. 获取用户资料...');
    const profileResponse = await axios.get(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const profile = profileResponse.data;
    console.log('✅ 用户资料获取成功');
    console.log(`   用户ID: ${profile.id}`);
    console.log(`   用户名: ${profile.username}`);
    console.log(`   角色: ${profile.role}`);
    console.log(`   状态: ${profile.status}`);
    
    if (profile.distributor) {
      console.log('\n📋 分判商信息:');
      console.log(`   分判商ID: ${profile.distributor.id}`);
      console.log(`   分判商名称: ${profile.distributor.name}`);
      console.log(`   联系人: ${profile.distributor.contactName || '无'}`);
      console.log(`   电话: ${profile.distributor.phone || '无'}`);
      console.log(`   邮箱: ${profile.distributor.email || '无'}`);
      console.log(`   状态: ${profile.distributor.status}`);
    } else {
      console.log('❌ 用户资料中没有分判商信息');
    }
    
    // 3. 测试分判商专用API
    console.log('\n3. 测试分判商专用API...');
    const distributorResponse = await axios.get(`${baseURL}/distributors/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 分判商API访问成功');
    console.log(`   分判商名称: ${distributorResponse.data.name}`);
    
    console.log('\n🎉 所有测试通过！前端DistributorLayout组件现在可以正确获取分判商信息。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testDistributorAPI();
