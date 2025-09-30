const { PrismaClient } = require('@prisma/client');

async function testServiceDirect() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 直接测试Service方法 ===');
    
    // 模拟findAll方法
    const categories = await prisma.itemCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('findAll结果数量:', categories.length);
    console.log('第一个分类的字段:', Object.keys(categories[0] || {}));
    console.log('第一个分类数据:', JSON.stringify(categories[0], null, 2));
    
    // 检查是否有code字段
    if (categories[0] && 'code' in categories[0]) {
      console.log('✅ code字段存在:', categories[0].code);
    } else {
      console.log('❌ code字段不存在');
    }
    
  } catch (error) {
    console.error('Service测试错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServiceDirect();
