const axios = require('axios');

async function testGuardFlow() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('🧪 测试GUARD用户登录流程...\n');
    
    // 1. 登录
    console.log('1. GUARD用户登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'guard001',
      password: 'guard123'
    });
    
    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功');
    console.log(`   用户名: ${loginResponse.data.user.username}`);
    console.log(`   角色: ${loginResponse.data.user.role}`);
    console.log(`   状态: ${loginResponse.data.user.status}`);
    
    // 2. 获取用户资料
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
    
    if (profile.guard) {
      console.log('\n📋 门卫信息:');
      console.log(`   门卫ID: ${profile.guard.id}`);
      console.log(`   门卫编号: ${profile.guard.guardId}`);
      console.log(`   姓名: ${profile.guard.name}`);
      console.log(`   电话: ${profile.guard.phone || '无'}`);
      console.log(`   邮箱: ${profile.guard.email || '无'}`);
      console.log(`   状态: ${profile.guard.status}`);
      console.log(`   站点ID: ${profile.guard.siteId}`);
    } else {
      console.log('❌ 用户资料中没有门卫信息');
    }
    
    // 3. 测试门卫专用API
    console.log('\n3. 测试门卫专用API...');
    const guardResponse = await axios.get(`${baseURL}/guards/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 门卫API访问成功');
    console.log(`   门卫姓名: ${guardResponse.data.name}`);
    console.log(`   门卫编号: ${guardResponse.data.guardId}`);
    
    console.log('\n🎉 GUARD流程测试完成！');
    console.log('\n📝 前端测试步骤:');
    console.log('1. 确保前端服务器运行在 http://localhost:3001');
    console.log('2. 确保后端服务器运行在 http://localhost:3000');
    console.log('3. 打开浏览器访问 http://localhost:3001');
    console.log('4. 使用用户名: guard001, 密码: guard123 登录');
    console.log('5. 登录成功后应该自动跳转到 /guard 页面');
    console.log('6. 不应该出现反复跳转的问题');
    console.log('7. 应该能正常访问门卫相关功能');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testGuardFlow();
