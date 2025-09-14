const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // 查询分类数据
    const categories = await prisma.itemCategory.findMany({
      take: 3,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true
      }
    });
    
    console.log('Categories from database:', categories);
    
    // 测试创建新分类
    const newCategory = await prisma.itemCategory.create({
      data: {
        name: '测试分类' + Date.now(),
        description: '这是一个测试分类',
        status: 'ACTIVE'
      }
    });
    
    console.log('Created category:', newCategory);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
