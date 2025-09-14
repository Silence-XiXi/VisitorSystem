const { PrismaClient } = require('@prisma/client');

async function verifyPrismaTypes() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== 验证Prisma客户端类型 ===');
    
    // 1. 测试查询现有分类（包含code字段）
    console.log('\n1. 查询现有分类:');
    const existingCategories = await prisma.itemCategory.findMany({
      take: 3,
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
    
    console.log('现有分类数据:', JSON.stringify(existingCategories, null, 2));
    
    // 2. 测试创建新分类（不提供code，让后端自动生成）
    console.log('\n2. 创建新分类（不提供code）:');
    const newCategory = await prisma.itemCategory.create({
      data: {
        name: '测试分类_' + Date.now(),
        description: '这是一个测试分类，用于验证code字段自动生成',
        status: 'ACTIVE'
      }
    });
    
    console.log('新创建的分类:', JSON.stringify(newCategory, null, 2));
    
    // 3. 测试创建新分类（提供code）
    console.log('\n3. 创建新分类（提供code）:');
    const newCategoryWithCode = await prisma.itemCategory.create({
      data: {
        code: 'CTEST001',
        name: '测试分类带编号_' + Date.now(),
        description: '这是一个带编号的测试分类',
        status: 'ACTIVE'
      }
    });
    
    console.log('带编号的新分类:', JSON.stringify(newCategoryWithCode, null, 2));
    
    // 4. 验证code字段的唯一性
    console.log('\n4. 验证code字段唯一性:');
    try {
      await prisma.itemCategory.create({
        data: {
          code: 'CTEST001', // 重复的code
          name: '重复编号测试',
          description: '这个应该失败',
          status: 'ACTIVE'
        }
      });
      console.log('❌ 唯一性验证失败：应该抛出错误但没有');
    } catch (error) {
      console.log('✅ 唯一性验证成功：', error.message);
    }
    
    // 5. 清理测试数据
    console.log('\n5. 清理测试数据:');
    await prisma.itemCategory.deleteMany({
      where: {
        name: {
          startsWith: '测试分类'
        }
      }
    });
    console.log('✅ 测试数据已清理');
    
  } catch (error) {
    console.error('❌ 验证过程中出现错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPrismaTypes();
