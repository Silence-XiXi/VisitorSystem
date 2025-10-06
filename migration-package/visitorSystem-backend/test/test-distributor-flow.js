const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testDistributorFlow() {
  try {
    console.log('🧪 测试DISTRIBUTOR完整登录流程...\n');

    // 1. 测试分判商登录
    console.log('1. 分判商登录测试...');
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

    // 2. 验证用户资料
    console.log('\n2. 验证用户资料...');
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ 用户资料验证成功:');
    console.log(`   角色: ${profileResponse.data.role}`);
    console.log(`   用户名: ${profileResponse.data.username}`);

    // 3. 测试分判商专用API
    console.log('\n3. 测试分判商专用API...');
    try {
      const distributorResponse = await axios.get(`${API_BASE_URL}/distributors/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ 分判商API访问成功:');
      console.log(`   分判商ID: ${distributorResponse.data.id}`);
      console.log(`   分判商名称: ${distributorResponse.data.name}`);
    } catch (apiError) {
      console.log('❌ 分判商API访问失败:', apiError.response?.data?.message || apiError.message);
    }

    // 4. 测试分判商工人管理API
    console.log('\n4. 测试分判商工人管理API...');
    try {
      const workersResponse = await axios.get(`${API_BASE_URL}/distributors/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ 工人管理API访问成功:');
      console.log(`   工人数量: ${workersResponse.data.length}`);
    } catch (apiError) {
      console.log('❌ 工人管理API访问失败:', apiError.response?.data?.message || apiError.message);
    }

    console.log('\n🎉 DISTRIBUTOR流程测试完成！');
    console.log('\n📝 前端测试步骤:');
    console.log('1. 确保前端服务器运行在 http://localhost:3001');
    console.log('2. 确保后端服务器运行在 http://localhost:3000');
    console.log('3. 打开浏览器访问 http://localhost:3001');
    console.log('4. 使用用户名: bjadmin, 密码: distributor123 登录');
    console.log('5. 登录成功后应该自动跳转到 /distributor/workers 页面');
    console.log('6. 不应该出现反复跳转的问题');
    console.log('7. 应该能正常访问分判商相关功能');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 提示: 用户名或密码错误，请检查测试账号');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 后端服务器未启动，请运行 npm run start:dev');
    }
  }
}

// 运行测试
testDistributorFlow();
