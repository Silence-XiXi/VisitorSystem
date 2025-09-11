import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// 测试账号
const testAccounts = [
  { username: 'admin', password: 'admin123', role: 'ADMIN' },
  { username: 'bjadmin', password: 'distributor123', role: 'DISTRIBUTOR' },
  { username: 'guard001', password: 'guard123', role: 'GUARD' }
];

async function testLogin(username: string, password: string, expectedRole: string) {
  try {
    console.log(`\n🔐 测试登录: ${username} (期望角色: ${expectedRole})`);
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password
    });

    const { access_token, user } = response.data;
    console.log(`✅ 登录成功!`);
    console.log(`   用户ID: ${user.id}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role}`);
    console.log(`   状态: ${user.status}`);

    if (user.role !== expectedRole) {
      console.log(`❌ 角色不匹配! 期望: ${expectedRole}, 实际: ${user.role}`);
      return null;
    }

    return { access_token, user };
  } catch (error: any) {
    console.log(`❌ 登录失败: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testRoleAccess(token: string, role: string) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log(`\n🔍 测试 ${role} 角色权限:`);

  try {
    // 测试获取用户信息
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, { headers });
    console.log(`✅ 获取用户信息成功`);

    // 根据角色测试不同的API
    switch (role) {
      case 'ADMIN':
        await testAdminAccess(headers);
        break;
      case 'DISTRIBUTOR':
        await testDistributorAccess(headers);
        break;
      case 'GUARD':
        await testGuardAccess(headers);
        break;
    }

  } catch (error: any) {
    console.log(`❌ 权限测试失败: ${error.response?.data?.message || error.message}`);
  }
}

async function testAdminAccess(headers: any) {
  console.log(`\n👑 测试管理员权限:`);
  
  try {
    const statsResponse = await axios.get(`${BASE_URL}/admin/stats`, { headers });
    console.log(`✅ 获取系统统计成功`);
    
    const distributorsResponse = await axios.get(`${BASE_URL}/admin/distributors`, { headers });
    console.log(`✅ 获取分销商列表成功 (${distributorsResponse.data.length} 个)`);
    
    const sitesResponse = await axios.get(`${BASE_URL}/admin/sites`, { headers });
    console.log(`✅ 获取工地列表成功 (${sitesResponse.data.length} 个)`);
    
    const guardsResponse = await axios.get(`${BASE_URL}/admin/guards`, { headers });
    console.log(`✅ 获取门卫列表成功 (${guardsResponse.data.length} 个)`);
    
    const workersResponse = await axios.get(`${BASE_URL}/admin/workers`, { headers });
    console.log(`✅ 获取工人列表成功 (${workersResponse.data.length} 个)`);
    
  } catch (error: any) {
    console.log(`❌ 管理员权限测试失败: ${error.response?.data?.message || error.message}`);
  }
}

async function testDistributorAccess(headers: any) {
  console.log(`\n🏢 测试分销商权限:`);
  
  try {
    const profileResponse = await axios.get(`${BASE_URL}/distributors/profile`, { headers });
    console.log(`✅ 获取分销商信息成功`);
    
    const sitesResponse = await axios.get(`${BASE_URL}/distributors/sites`, { headers });
    console.log(`✅ 获取管理的工地列表成功 (${sitesResponse.data.length} 个)`);
    
    const workersResponse = await axios.get(`${BASE_URL}/distributors/workers`, { headers });
    console.log(`✅ 获取管理的工人列表成功 (${workersResponse.data.length} 个)`);
    
    const statsResponse = await axios.get(`${BASE_URL}/distributors/stats`, { headers });
    console.log(`✅ 获取统计数据成功`);
    
  } catch (error: any) {
    console.log(`❌ 分销商权限测试失败: ${error.response?.data?.message || error.message}`);
  }
}

async function testGuardAccess(headers: any) {
  console.log(`\n🛡️ 测试门卫权限:`);
  
  try {
    const profileResponse = await axios.get(`${BASE_URL}/guards/profile`, { headers });
    console.log(`✅ 获取门卫信息成功`);
    
    const workersResponse = await axios.get(`${BASE_URL}/guards/workers`, { headers });
    console.log(`✅ 获取工地工人列表成功 (${workersResponse.data.length} 个)`);
    
    const recordsResponse = await axios.get(`${BASE_URL}/guards/borrow-records`, { headers });
    console.log(`✅ 获取借用记录成功 (${recordsResponse.data.length} 个)`);
    
    const statsResponse = await axios.get(`${BASE_URL}/guards/stats`, { headers });
    console.log(`✅ 获取统计数据成功`);
    
  } catch (error: any) {
    console.log(`❌ 门卫权限测试失败: ${error.response?.data?.message || error.message}`);
  }
}

async function testCrossRoleAccess(token: string, role: string) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log(`\n🚫 测试 ${role} 跨角色访问限制:`);

  // 测试访问其他角色的API
  const forbiddenEndpoints = [
    { url: '/admin/stats', name: '管理员统计' },
    { url: '/distributors/profile', name: '分销商信息' },
    { url: '/guards/profile', name: '门卫信息' }
  ];

  for (const endpoint of forbiddenEndpoints) {
    // 跳过自己角色的端点
    if ((role === 'ADMIN' && endpoint.url.includes('/admin/')) ||
        (role === 'DISTRIBUTOR' && endpoint.url.includes('/distributors/')) ||
        (role === 'GUARD' && endpoint.url.includes('/guards/'))) {
      continue;
    }

    try {
      await axios.get(`${BASE_URL}${endpoint.url}`, { headers });
      console.log(`❌ ${endpoint.name} - 应该被拒绝但成功了`);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.log(`✅ ${endpoint.name} - 正确被拒绝 (403)`);
      } else {
        console.log(`⚠️ ${endpoint.name} - 其他错误: ${error.response?.status}`);
      }
    }
  }
}

async function main() {
  console.log('🚀 开始测试角色权限系统...\n');

  for (const account of testAccounts) {
    const loginResult = await testLogin(account.username, account.password, account.role);
    
    if (loginResult) {
      await testRoleAccess(loginResult.access_token, account.role);
      await testCrossRoleAccess(loginResult.access_token, account.role);
    }
  }

  console.log('\n🎉 角色权限测试完成!');
}

// 运行测试
main().catch(console.error);
