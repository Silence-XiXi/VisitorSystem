const { PrismaClient } = require('@prisma/client');

async function testControllerDirect() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 直接测试Controller逻辑 ===');
    
    // 模拟findAll方法（与controller中完全一样）
    const categories = await prisma.itemCategory.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('Controller findAll结果:');
    console.log('数量:', categories.length);
    console.log('第一个分类字段:', Object.keys(categories[0] || {}));
    console.log('第一个分类数据:', JSON.stringify(categories[0], null, 2));
    
    // 检查序列化
    const serialized = JSON.stringify(categories[0]);
    const parsed = JSON.parse(serialized);
    console.log('序列化后字段:', Object.keys(parsed));
    console.log('序列化后code字段:', parsed.code);
    
  } catch (error) {
    console.error('Controller测试错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testControllerDirect();
