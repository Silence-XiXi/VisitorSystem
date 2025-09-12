const axios = require('axios');

async function testCreateGuard() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('🧪 测试创建门卫API...\n');
    
    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 管理员登录成功');
    console.log(`   用户名: ${loginResponse.data.user.username}`);
    console.log(`   角色: ${loginResponse.data.user.role}`);
    
    // 2. 创建门卫
    console.log('\n2. 创建新门卫...');
    const guardData = {
      guardId: 'G999',
      name: '测试门卫',
      siteId: '1',
      phone: '13800138999',
      email: 'test@example.com',
      whatsapp: '+86 13800138999',
      username: 'testguard',
      password: 'Pass@123'
    };
    
    const createResponse = await axios.post(`${baseURL}/admin/guards`, guardData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 门卫创建成功');
    console.log(`   门卫ID: ${createResponse.data.id}`);
    console.log(`   门卫编号: ${createResponse.data.guardId}`);
    console.log(`   姓名: ${createResponse.data.name}`);
    console.log(`   电话: ${createResponse.data.phone}`);
    console.log(`   邮箱: ${createResponse.data.email}`);
    console.log(`   站点ID: ${createResponse.data.siteId}`);
    console.log(`   用户名: ${createResponse.data.user?.username || 'N/A'}`);
    
    // 3. 验证门卫可以登录
    console.log('\n3. 验证新门卫可以登录...');
    const guardLoginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'testguard',
      password: 'Pass@123'
    });
    
    console.log('✅ 新门卫登录成功');
    console.log(`   用户名: ${guardLoginResponse.data.user.username}`);
    console.log(`   角色: ${guardLoginResponse.data.user.role}`);
    console.log(`   状态: ${guardLoginResponse.data.user.status}`);
    
    // 4. 获取门卫资料
    console.log('\n4. 获取门卫资料...');
    const guardToken = guardLoginResponse.data.access_token;
    const profileResponse = await axios.get(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${guardToken}` }
    });
    
    console.log('✅ 门卫资料获取成功');
    if (profileResponse.data.guard) {
      console.log(`   门卫信息: ${profileResponse.data.guard.name} (${profileResponse.data.guard.guardId})`);
    }
    
    console.log('\n🎉 门卫创建和验证测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testCreateGuard();

