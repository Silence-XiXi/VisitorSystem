import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建测试数据...');

  // 1. 创建管理员用户
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

  console.log('✓ 管理员用户创建成功');

  // 2. 创建多个分判商
  const distributors = [
    {
      username: 'bjadmin',
      password: 'dist123',
      distributorId: 'D001',
      name: '北京建筑公司',
      contactName: '刘强',
      phone: '010-88888888',
      email: 'contact-bj@corp.com',
      whatsapp: '+86 13800138001',
    },
    {
      username: 'shadmin',
      password: 'dist123',
      distributorId: 'D002',
      name: '上海工程集团',
      contactName: '王明',
      phone: '021-66666666',
      email: 'contact-sh@corp.com',
      whatsapp: '+86 13900139001',
    },
    {
      username: 'gzadmin',
      password: 'dist123',
      distributorId: 'D003',
      name: '广州建设有限公司',
      contactName: '李华',
      phone: '020-77777777',
      email: 'contact-gz@corp.com',
      whatsapp: '+86 13700137001',
    }
  ];

  const createdDistributors = [];
  for (const dist of distributors) {
    const password = await bcrypt.hash(dist.password, 10);
    
    const user = await prisma.user.upsert({
      where: { username: dist.username },
      update: {},
      create: {
        username: dist.username,
        password: password,
        role: 'DISTRIBUTOR',
        status: 'ACTIVE',
      },
    });

    const distributor = await prisma.distributor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        distributorId: dist.distributorId,
        name: dist.name,
        contactName: dist.contactName,
        phone: dist.phone,
        email: dist.email,
        whatsapp: dist.whatsapp,
        status: 'ACTIVE',
        userId: user.id,
      },
    });

    createdDistributors.push(distributor);
  }

  console.log('✓ 分判商创建成功');

  // 3. 创建多个工地
  const sites = [
    {
      name: '北京CBD项目',
      address: '北京市朝阳区CBD核心区',
      code: 'BJ-CBD-001',
      manager: '赵强',
      phone: '010-88886666',
    },
    {
      name: '上海浦东金融中心',
      address: '上海市浦东新区陆家嘴金融贸易区',
      code: 'SH-PD-001',
      manager: '陈伟',
      phone: '021-66665555',
    },
    {
      name: '广州珠江新城',
      address: '广州市天河区珠江新城',
      code: 'GZ-ZJ-001',
      manager: '林志强',
      phone: '020-77774444',
    }
  ];

  const createdSites = [];
  for (const site of sites) {
    const createdSite = await prisma.site.upsert({
      where: { code: site.code },
      update: {},
      create: {
        name: site.name,
        address: site.address,
        code: site.code,
        manager: site.manager,
        phone: site.phone,
        status: 'ACTIVE',
      },
    });
    createdSites.push(createdSite);
  }

  console.log('✓ 工地创建成功');

  // 4. 关联分判商和工地
  for (let i = 0; i < createdDistributors.length; i++) {
    await prisma.siteDistributor.upsert({
      where: {
        siteId_distributorId: {
          siteId: createdSites[i].id,
          distributorId: createdDistributors[i].id,
        },
      },
      update: {},
      create: {
        siteId: createdSites[i].id,
        distributorId: createdDistributors[i].id,
      },
    });
  }

  console.log('✓ 分判商-工地关联创建成功');

  // 5. 创建多个门卫
  const guards = [
    {
      username: 'guard001',
      password: 'guard123',
      guardId: 'G001',
      name: '张保安',
      phone: '13800138001',
      email: 'zhangbaoan@site1.com',
      siteIndex: 0,
    },
    {
      username: 'guard002',
      password: 'guard123',
      guardId: 'G002',
      name: '李门卫',
      phone: '13800138002',
      email: 'limenwei@site2.com',
      siteIndex: 1,
    },
    {
      username: 'guard003',
      password: 'guard123',
      guardId: 'G003',
      name: '王警卫',
      phone: '13800138003',
      email: 'wangjingwei@site3.com',
      siteIndex: 2,
    }
  ];

  const createdGuards = [];
  for (const guard of guards) {
    const password = await bcrypt.hash(guard.password, 10);
    
    const user = await prisma.user.upsert({
      where: { username: guard.username },
      update: {},
      create: {
        username: guard.username,
        password: password,
        role: 'GUARD',
        status: 'ACTIVE',
      },
    });

    const createdGuard = await prisma.guard.upsert({
      where: { guardId: guard.guardId },
      update: {},
      create: {
        guardId: guard.guardId,
        name: guard.name,
        phone: guard.phone,
        email: guard.email,
        whatsapp: guard.phone,
        status: 'ACTIVE',
        siteId: createdSites[guard.siteIndex].id,
        userId: user.id,
      },
    });

    createdGuards.push(createdGuard);
  }

  console.log('✓ 门卫创建成功');

  // 6. 创建工人数据
  const workers = [
    {
      workerId: 'W001',
      name: '张三',
      gender: 'MALE' as const,
      idType: 'ID_CARD' as const,
      idNumber: '110101199001011234',
      region: '北京',
      phone: '13900139001',
      email: 'zhangsan@worker.com',
      birthDate: new Date('1990-01-01'),
      distributorIndex: 0,
      siteIndex: 0,
    },
    {
      workerId: 'W002',
      name: '李四',
      gender: 'MALE' as const,
      idType: 'ID_CARD' as const,
      idNumber: '110101199002021234',
      region: '北京',
      phone: '13900139002',
      email: 'lisi@worker.com',
      birthDate: new Date('1990-02-02'),
      distributorIndex: 0,
      siteIndex: 0,
    },
    {
      workerId: 'W003',
      name: '王五',
      gender: 'FEMALE' as const,
      idType: 'ID_CARD' as const,
      idNumber: '310101199003031234',
      region: '上海',
      phone: '13900139003',
      email: 'wangwu@worker.com',
      birthDate: new Date('1990-03-03'),
      distributorIndex: 1,
      siteIndex: 1,
    },
    {
      workerId: 'W004',
      name: '赵六',
      gender: 'MALE' as const,
      idType: 'ID_CARD' as const,
      idNumber: '440101199004041234',
      region: '广东',
      phone: '13900139004',
      email: 'zhaoliu@worker.com',
      birthDate: new Date('1990-04-04'),
      distributorIndex: 2,
      siteIndex: 2,
    }
  ];

  const createdWorkers = [];
  for (const worker of workers) {
    const createdWorker = await prisma.worker.upsert({
      where: { workerId: worker.workerId },
      update: {},
      create: {
        workerId: worker.workerId,
        name: worker.name,
        gender: worker.gender,
        idType: worker.idType,
        idNumber: worker.idNumber,
        region: worker.region,
        phone: worker.phone,
        email: worker.email,
        whatsapp: worker.phone,
        birthDate: worker.birthDate,
        status: 'ACTIVE',
        distributorId: createdDistributors[worker.distributorIndex].id,
        siteId: createdSites[worker.siteIndex].id,
      },
    });
    createdWorkers.push(createdWorker);
  }

  console.log('✓ 工人创建成功');

  // 7. 创建物品分类
  const categories = [
    { name: '门禁卡', description: '用于进出工地、办公室等场所的门禁卡', code: 'CARD' },
    { name: '钥匙', description: '各种门锁、柜子、工具箱等的钥匙', code: 'KEY' },
    { name: '梯子', description: '各种高度和类型的梯子，用于高空作业', code: 'LADDER' },
    { name: '安全帽', description: '工地安全防护用品，各种颜色和尺寸', code: 'HELMET' },
    { name: '工具', description: '各种手动和电动工具，如扳手、电钻等', code: 'TOOL' },
    { name: '防护用品', description: '安全眼镜、手套、口罩等个人防护用品', code: 'PPE' },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const createdCategory = await prisma.itemCategory.upsert({
      where: { name: category.name },
      update: {},
      create: {
        name: category.name,
        description: category.description,
        status: 'ACTIVE',
        code: category.code,
      },
    });
    createdCategories.push(createdCategory);
  }

  console.log('✓ 物品分类创建成功');

  // 8. 创建物品
  const items = [
    { itemCode: 'CARD001', name: '门禁卡-001', description: '蓝色门禁卡', categoryIndex: 0 },
    { itemCode: 'CARD002', name: '门禁卡-002', description: '红色门禁卡', categoryIndex: 0 },
    { itemCode: 'KEY001', name: '办公室钥匙', description: '主办公室钥匙', categoryIndex: 1 },
    { itemCode: 'KEY002', name: '工具房钥匙', description: '工具房钥匙', categoryIndex: 1 },
    { itemCode: 'LADDER001', name: '人字梯', description: '2米人字梯', categoryIndex: 2 },
    { itemCode: 'LADDER002', name: '伸缩梯', description: '3米伸缩梯', categoryIndex: 2 },
    { itemCode: 'HELMET001', name: '白色安全帽', description: 'L号白色安全帽', categoryIndex: 3 },
    { itemCode: 'HELMET002', name: '黄色安全帽', description: 'M号黄色安全帽', categoryIndex: 3 },
    { itemCode: 'TOOL001', name: '电钻', description: '博世电钻', categoryIndex: 4 },
    { itemCode: 'TOOL002', name: '扳手套装', description: '10件套扳手', categoryIndex: 4 },
    { itemCode: 'PPE001', name: '安全眼镜', description: '防冲击安全眼镜', categoryIndex: 5 },
    { itemCode: 'PPE002', name: '防护手套', description: '防割手套', categoryIndex: 5 },
  ];

  const createdItems = [];
  for (const item of items) {
    const createdItem = await prisma.item.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: {
        itemCode: item.itemCode,
        name: item.name,
        description: item.description,
        status: 'AVAILABLE',
        categoryId: createdCategories[item.categoryIndex].id,
      },
    });
    createdItems.push(createdItem);
  }

  console.log('✓ 物品创建成功');

  // 9. 创建借用记录
  const borrowRecords = [
    {
      workerId: createdWorkers[0].id,
      siteId: createdSites[0].id,
      itemId: createdItems[0].id,
      borrowHandlerId: createdGuards[0].id,
      borrowDate: new Date('2024-01-15'),
      borrowTime: '09:00',
      status: 'BORROWED' as const,
      notes: '正常借用',
    },
    {
      workerId: createdWorkers[1].id,
      siteId: createdSites[0].id,
      itemId: createdItems[2].id,
      borrowHandlerId: createdGuards[0].id,
      borrowDate: new Date('2024-01-15'),
      borrowTime: '10:30',
      status: 'RETURNED' as const,
      returnDate: new Date('2024-01-15'),
      returnTime: '17:00',
      returnHandlerId: createdGuards[0].id,
      notes: '已归还',
    },
    {
      workerId: createdWorkers[2].id,
      siteId: createdSites[1].id,
      itemId: createdItems[4].id,
      borrowHandlerId: createdGuards[1].id,
      borrowDate: new Date('2024-01-16'),
      borrowTime: '08:00',
      status: 'BORROWED' as const,
      notes: '高空作业使用',
    }
  ];

  for (const record of borrowRecords) {
    await prisma.itemBorrowRecord.create({
      data: {
        workerId: record.workerId,
        siteId: record.siteId,
        itemId: record.itemId,
        borrowHandlerId: record.borrowHandlerId,
        returnHandlerId: record.returnHandlerId,
        borrowDate: record.borrowDate,
        borrowTime: record.borrowTime,
        returnDate: record.returnDate,
        returnTime: record.returnTime,
        status: record.status,
        notes: record.notes,
      },
    });
  }

  console.log('✓ 借用记录创建成功');

  // 10. 创建访客记录
  const visitorRecords = [
    {
      workerId: createdWorkers[0].id,
      siteId: createdSites[0].id,
      registrarId: createdGuards[0].id,
      checkInTime: new Date('2024-01-15T08:30:00'),
      status: 'ON_SITE' as const,
      idType: 'ID_CARD' as const,
      idNumber: createdWorkers[0].idNumber,
      physicalCardId: 'PC001',
      notes: '正常上班',
    },
    {
      workerId: createdWorkers[1].id,
      siteId: createdSites[0].id,
      registrarId: createdGuards[0].id,
      checkInTime: new Date('2024-01-15T09:00:00'),
      checkOutTime: new Date('2024-01-15T18:00:00'),
      status: 'LEFT' as const,
      idType: 'ID_CARD' as const,
      idNumber: createdWorkers[1].idNumber,
      physicalCardId: 'PC002',
      notes: '下班离开',
    },
    {
      workerId: createdWorkers[2].id,
      siteId: createdSites[1].id,
      registrarId: createdGuards[1].id,
      checkInTime: new Date('2024-01-16T07:30:00'),
      status: 'ON_SITE' as const,
      idType: 'ID_CARD' as const,
      idNumber: createdWorkers[2].idNumber,
      physicalCardId: 'PC003',
      notes: '早班工人',
    }
  ];

  for (const record of visitorRecords) {
    await prisma.visitorRecord.create({
      data: {
        workerId: record.workerId,
        siteId: record.siteId,
        registrarId: record.registrarId,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        status: record.status,
        idType: record.idType,
        idNumber: record.idNumber,
        physicalCardId: record.physicalCardId,
        notes: record.notes,
      },
    });
  }

  console.log('✓ 访客记录创建成功');

  console.log('\n🎉 数据库种子数据创建完成！');
  console.log('\n📋 测试账号信息:');
  console.log('管理员账号: admin / admin123');
  console.log('分判商账号: bjadmin / dist123');
  console.log('分判商账号: shadmin / dist123');
  console.log('分判商账号: gzadmin / dist123');
  console.log('门卫账号: guard001 / guard123');
  console.log('门卫账号: guard002 / guard123');
  console.log('门卫账号: guard003 / guard123');
  console.log('\n📊 创建的数据统计:');
  console.log(`- 用户: ${distributors.length + 1 + guards.length} 个`);
  console.log(`- 分判商: ${distributors.length} 个`);
  console.log(`- 工地: ${sites.length} 个`);
  console.log(`- 门卫: ${guards.length} 个`);
  console.log(`- 工人: ${workers.length} 个`);
  console.log(`- 物品分类: ${categories.length} 个`);
  console.log(`- 物品: ${items.length} 个`);
  console.log(`- 借用记录: ${borrowRecords.length} 个`);
  console.log(`- 访客记录: ${visitorRecords.length} 个`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
