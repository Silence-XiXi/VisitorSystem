const { PrismaClient } = require('@prisma/client');

async function checkAdmin() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 查询管理员用户...\n');
    
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (admin) {
      console.log('✅ 找到管理员用户:');
      console.log(`   用户名: ${admin.username}`);
      console.log(`   角色: ${admin.role}`);
      console.log(`   状态: ${admin.status}`);
      console.log(`   创建时间: ${admin.createdAt}`);
    } else {
      console.log('❌ 未找到管理员用户');
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();

