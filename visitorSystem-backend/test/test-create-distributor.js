const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testCreateDistributor() {
  try {
    console.log('🧪 测试新增分判商功能...\n');

    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginResponse.data.access_token;
    console.log('✅ 登录成功，获得token');

    // 2. 获取当前分判商列表
    console.log('\n2. 获取当前分判商列表...');
    const distributorsResponse = await axios.get(`${API_BASE_URL}/admin/distributors`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const currentCount = distributorsResponse.data.length;
    console.log(`✅ 当前分判商数量: ${currentCount}`);

    // 3. 创建新分判商
    console.log('\n3. 创建新分判商...');
    const newDistributor = {
      name: '测试分判商',
      contactName: '张测试',
      phone: '13800138000',
      email: 'test@example.com',
      whatsapp: '+8613800138000',
      username: 'testdistributor',
      password: 'Test@123',
      siteIds: []
    };

    const createResponse = await axios.post(`${API_BASE_URL}/admin/distributors`, newDistributor, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ 分判商创建成功:');
    console.log(`   ID: ${createResponse.data.id}`);
    console.log(`   名称: ${createResponse.data.name}`);
    console.log(`   联系人: ${createResponse.data.contactName}`);
    console.log(`   电话: ${createResponse.data.phone}`);
    console.log(`   邮箱: ${createResponse.data.email}`);

    // 4. 验证分判商已创建
    console.log('\n4. 验证分判商已创建...');
    const updatedDistributorsResponse = await axios.get(`${API_BASE_URL}/admin/distributors`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const newCount = updatedDistributorsResponse.data.length;
    console.log(`✅ 更新后分判商数量: ${newCount}`);
    console.log(`✅ 新增分判商数量: ${newCount - currentCount}`);

    // 5. 测试新分判商登录
    console.log('\n5. 测试新分判商登录...');
    try {
      const distributorLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        username: newDistributor.username,
        password: newDistributor.password
      });

      console.log('✅ 新分判商登录成功:');
      console.log(`   用户名: ${distributorLoginResponse.data.user.username}`);
      console.log(`   角色: ${distributorLoginResponse.data.user.role}`);
    } catch (loginError) {
      console.log('❌ 新分判商登录失败:', loginError.response?.data?.message || loginError.message);
    }

    console.log('\n🎉 新增分判商功能测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCreateDistributor();
