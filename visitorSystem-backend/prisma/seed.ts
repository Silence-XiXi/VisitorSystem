import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建默认管理员用户
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('默认管理员用户创建成功:', admin);

  // 创建测试分判商用户
  const distributorPassword = await bcrypt.hash('dist123', 10);
  
  const distributorUser = await prisma.user.upsert({
    where: { username: 'bjadmin' },
    update: {},
    create: {
      username: 'bjadmin',
      password: distributorPassword,
      role: 'DISTRIBUTOR',
      status: 'ACTIVE',
    },
  });

  const distributor = await prisma.distributor.upsert({
    where: { userId: distributorUser.id },
    update: {},
    create: {
      name: '北京建筑公司',
      contactName: '刘强',
      phone: '010-88888888',
      email: 'contact-bj@corp.com',
      whatsapp: '+86 13800138001',
      status: 'ACTIVE',
      userId: distributorUser.id,
    },
  });

  console.log('测试分判商创建成功:', distributor);

  // 创建测试工地
  const site = await prisma.site.upsert({
    where: { code: 'BJ-CBD-001' },
    update: {},
    create: {
      name: '北京CBD项目',
      address: '北京市朝阳区CBD核心区',
      code: 'BJ-CBD-001',
      manager: '赵强',
      phone: '010-88886666',
      status: 'ACTIVE',
    },
  });

  console.log('测试工地创建成功:', site);

  // 关联分判商和工地
  await prisma.siteDistributor.upsert({
    where: {
      siteId_distributorId: {
        siteId: site.id,
        distributorId: distributor.id,
      },
    },
    update: {},
    create: {
      siteId: site.id,
      distributorId: distributor.id,
    },
  });

  // 创建测试门卫用户
  const guardPassword = await bcrypt.hash('guard123', 10);
  
  const guardUser = await prisma.user.upsert({
    where: { username: 'guard001' },
    update: {},
    create: {
      username: 'guard001',
      password: guardPassword,
      role: 'GUARD',
      status: 'ACTIVE',
    },
  });

  const guard = await prisma.guard.upsert({
    where: { guardId: 'G001' },
    update: {},
    create: {
      guardId: 'G001',
      name: '张保安',
      phone: '13800138001',
      email: 'zhangbaoan@site1.com',
      whatsapp: '+86 13800138001',
      status: 'ACTIVE',
      siteId: site.id,
      userId: guardUser.id,
    },
  });

  console.log('测试门卫创建成功:', guard);

  // 创建物品分类
  const categories = [
    { name: '门禁卡', description: '用于进出工地、办公室等场所的门禁卡' },
    { name: '钥匙', description: '各种门锁、柜子、工具箱等的钥匙' },
    { name: '梯子', description: '各种高度和类型的梯子，用于高空作业' },
    { name: '安全帽', description: '工地安全防护用品，各种颜色和尺寸' },
    { name: '工具', description: '各种手动和电动工具，如扳手、电钻等' },
    { name: '防护用品', description: '安全眼镜、手套、口罩等个人防护用品' },
  ];

  for (const category of categories) {
    await prisma.itemCategory.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
        status: 'ACTIVE',
      },
    });
  }

  console.log('物品分类创建成功');

  console.log('数据库种子数据创建完成！');
  console.log('默认管理员账号: admin / admin123');
  console.log('测试分判商账号: bjadmin / dist123');
  console.log('测试门卫账号: guard001 / guard123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
