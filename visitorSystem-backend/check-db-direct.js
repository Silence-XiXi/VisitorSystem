const { PrismaClient } = require('@prisma/client');

async function checkDatabaseDirect() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 直接查询数据库 ===');
    
    // 查询特定分类
    const category = await prisma.itemCategory.findUnique({
      where: { id: 'cmfge4iaz0000buekwmd7v1vz' },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('特定分类数据:', JSON.stringify(category, null, 2));
    
    // 查询所有分类的code字段
    const allCategories = await prisma.itemCategory.findMany({
      select: {
        id: true,
        code: true,
        name: true
      },
      take: 5
    });
    
    console.log('\n所有分类的code字段:');
    allCategories.forEach(cat => {
      console.log(`ID: ${cat.id}, Code: ${cat.code}, Name: ${cat.name}`);
    });
    
  } catch (error) {
    console.error('数据库查询错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseDirect();
