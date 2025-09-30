const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testDistributorLogin() {
  try {
    console.log('🧪 测试DISTRIBUTOR角色登录...\n');

    // 1. 使用分判商账号登录
    console.log('1. 分判商登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'bjadmin',
      password: 'distributor123'
    });

    const token = loginResponse.data.access_token;
    const user = loginResponse.data.user;
    
    console.log('✅ 登录成功:');
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   状态: ${user.status}`);
    console.log(`   Token: ${token.substring(0, 50)}...`);

    // 2. 获取用户资料
    console.log('\n2. 获取用户资料...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ 用户资料:');
    console.log(JSON.stringify(profileResponse.data, null, 2));

    // 3. 测试分判商专用API
    console.log('\n3. 测试分判商专用API...');
    try {
      const distributorResponse = await axios.get(`${API_BASE_URL}/distributors/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ 分判商资料获取成功:');
      console.log(JSON.stringify(distributorResponse.data, null, 2));
    } catch (apiError) {
      console.log('❌ 分判商API调用失败:', apiError.response?.data?.message || apiError.message);
    }

    console.log('\n🎉 DISTRIBUTOR角色登录测试完成！');
    console.log('\n📝 前端测试说明:');
    console.log('1. 打开浏览器访问 http://localhost:3001');
    console.log('2. 使用用户名: bjadmin, 密码: distributor123 登录');
    console.log('3. 登录成功后应该自动跳转到 /distributor/workers 页面');
    console.log('4. 不应该出现反复跳转的问题');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testDistributorLogin();
