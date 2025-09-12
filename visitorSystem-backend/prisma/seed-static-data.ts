import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 前端静态数据
const mockDistributors = [
  {
    id: '1',
    distributorId: 'D1234567',
    name: '北京建筑公司',
    contactName: '刘强',
    phone: '010-88888888',
    email: 'contact-bj@corp.com',
    accountUsername: 'bjadmin',
    siteIds: ['1', '2'],
    accountStatus: 'active'
  },
  {
    id: '2',
    name: '上海工程集团',
    contactName: '王芳',
    phone: '021-66666666',
    email: 'contact-sh@corp.com',
    accountUsername: 'shadmin',
    siteIds: ['2', '3'],
    accountStatus: 'active'
  },
  {
    id: '3',
    name: '广州建设有限公司',
    contactName: '李明',
    phone: '020-77777777',
    email: 'contact-gz@corp.com',
    accountUsername: 'gzadmin',
    siteIds: ['3', '4'],
    accountStatus: 'disabled'
  },
  {
    id: '4',
    name: '深圳建筑集团',
    contactName: '周婷',
    phone: '0755-12345678',
    email: 'contact-sz@corp.com',
    accountUsername: 'szadmin',
    siteIds: ['4', '5'],
    accountStatus: 'active'
  },
  {
    id: '5',
    name: '杭州城建集团',
    contactName: '钱勇',
    phone: '0571-99999999',
    email: 'contact-hz@corp.com',
    accountUsername: 'hzadmin',
    siteIds: ['5', '6'],
    accountStatus: 'active'
  },
  {
    id: '6',
    name: '成都建工集团',
    contactName: '孙伟',
    phone: '028-55555555',
    email: 'contact-cd@corp.com',
    accountUsername: 'cdadmin',
    siteIds: ['6', '7'],
    accountStatus: 'active'
  },
  {
    id: '7',
    name: '武汉建设集团',
    contactName: '陈华',
    phone: '027-44444444',
    email: 'contact-wh@corp.com',
    accountUsername: 'whadmin',
    siteIds: ['7', '8'],
    accountStatus: 'active'
  },
  {
    id: '8',
    name: '西安建筑公司',
    contactName: '张伟',
    phone: '029-33333333',
    email: 'contact-xa@corp.com',
    accountUsername: 'xaadmin',
    siteIds: ['8', '9'],
    accountStatus: 'active'
  },
  {
    id: '9',
    name: '南京工程集团',
    contactName: '李敏',
    phone: '025-22222222',
    email: 'contact-nj@corp.com',
    accountUsername: 'njadmin',
    siteIds: ['9', '10'],
    accountStatus: 'disabled'
  },
  {
    id: '10',
    distributorId: 'D71RYP4P',
    name: '重庆建设有限公司',
    contactName: '王刚',
    phone: '023-11111111',
    email: 'contact-cq@corp.com',
    accountUsername: 'cqadmin',
    siteIds: ['10', '11'],
    accountStatus: 'active'
  },
  {
    id: '11',
    distributorId: 'DVV65BJ9',
    name: '天津建筑集团',
    contactName: '赵敏',
    phone: '022-00000000',
    email: 'contact-tj@corp.com',
    accountUsername: 'tjadmin',
    siteIds: ['11', '12'],
    accountStatus: 'active'
  },
  {
    id: '12',
    distributorId: 'DG23T8QG',
    name: '青岛建设公司',
    contactName: '刘芳',
    phone: '0532-99999999',
    email: 'contact-qd@corp.com',
    accountUsername: 'qdadmin',
    siteIds: ['12', '13'],
    accountStatus: 'active'
  },
  {
    id: '13',
    distributorId: 'DX016G0A',
    name: '大连工程集团',
    contactName: '孙华',
    phone: '0411-88888888',
    email: 'contact-dl@corp.com',
    accountUsername: 'dladmin',
    siteIds: ['13', '14'],
    accountStatus: 'disabled'
  },
  {
    id: '14',
    distributorId: 'DK7AQFBD',
    name: '厦门建筑有限公司',
    contactName: '陈伟',
    phone: '0592-77777777',
    email: 'contact-xm@corp.com',
    accountUsername: 'xmadmin',
    siteIds: ['14', '15'],
    accountStatus: 'active'
  },
  {
    id: '15',
    distributorId: 'D6UN6X6N',
    name: '苏州建设集团',
    contactName: '李强',
    phone: '0512-66666666',
    email: 'contact-sz2@corp.com',
    accountUsername: 'sz2admin',
    siteIds: ['15', '16'],
    accountStatus: 'active'
  },
  {
    id: '16',
    distributorId: 'DQZEMAKR',
    name: '无锡工程公司',
    contactName: '王敏',
    phone: '0510-55555555',
    email: 'contact-wx@corp.com',
    accountUsername: 'wxadmin',
    siteIds: ['16', '1'],
    accountStatus: 'active'
  }
];

const mockSites = [
  {
    id: '1',
    name: '北京CBD项目',
    address: '北京市朝阳区CBD核心区',
    code: 'BJ-CBD-001',
    manager: '赵强',
    phone: '010-88886666',
    status: 'active',
    distributorIds: ['1', '16']
  },
  {
    id: '2',
    name: '上海浦东项目',
    address: '上海市浦东新区陆家嘴',
    code: 'SH-PD-001',
    manager: '钱恒',
    phone: '021-68686868',
    status: 'active',
    distributorIds: ['1', '2']
  },
  {
    id: '3',
    name: '广州天河项目',
    address: '广州市天河区珠江新城',
    code: 'GZ-TH-001',
    manager: '孙丽',
    phone: '020-78787878',
    status: 'suspended',
    distributorIds: ['2', '3']
  },
  {
    id: '4',
    name: '深圳南山项目',
    address: '深圳市南山区科技园',
    code: 'SZ-NS-001',
    manager: '李雷',
    phone: '0755-13579246',
    status: 'active',
    distributorIds: ['3', '4']
  },
  {
    id: '5',
    name: '杭州西湖项目',
    address: '杭州市西湖区西湖景区',
    code: 'HZ-XH-001',
    manager: '王芳',
    phone: '0571-24681357',
    status: 'inactive',
    distributorIds: ['4', '5']
  },
  {
    id: '6',
    name: '成都天府项目',
    address: '成都市天府新区天府大道',
    code: 'CD-TF-001',
    manager: '陈刚',
    phone: '028-12344321',
    status: 'active',
    distributorIds: ['5', '6']
  },
  {
    id: '7',
    name: '武汉光谷项目',
    address: '武汉市东湖新技术开发区光谷大道',
    code: 'WH-GG-001',
    manager: '刘华',
    phone: '027-44446666',
    status: 'active',
    distributorIds: ['6', '7']
  },
  {
    id: '8',
    name: '西安高新区项目',
    address: '西安市高新区科技路',
    code: 'XA-GX-001',
    manager: '张伟',
    phone: '029-33335555',
    status: 'active',
    distributorIds: ['7', '8']
  },
  {
    id: '9',
    name: '南京江北项目',
    address: '南京市江北新区浦口大道',
    code: 'NJ-JB-001',
    manager: '李敏',
    phone: '025-22224444',
    status: 'suspended',
    distributorIds: ['8', '9']
  },
  {
    id: '10',
    name: '重庆两江项目',
    address: '重庆市两江新区金开大道',
    code: 'CQ-LJ-001',
    manager: '王刚',
    phone: '023-11113333',
    status: 'active',
    distributorIds: ['9', '10']
  },
  {
    id: '11',
    distributorId: 'DM8593Z9',
    name: '
    address: '天津市滨海新区滨海大道',
    code: 'TJ-BH-001',
    manager: '赵敏',
    phone: '022-00002222',
    status: 'active',
    distributorIds: ['10', '11']
  },
  {
    id: '12',
    distributorId: 'DU28D7GU',
    name: '
    address: '青岛市崂山区崂山路',
    code: 'QD-LS-001',
    manager: '刘芳',
    phone: '0532-99998888',
    status: 'active',
    distributorIds: ['11', '12']
  },
  {
    id: '13',
    distributorId: 'DKXYQHO8',
    name: '
    address: '大连市沙河口区星海广场',
    code: 'DL-XH-001',
    manager: '孙华',
    phone: '0411-88887777',
    status: 'inactive',
    distributorIds: ['12', '13']
  },
  {
    id: '14',
    distributorId: 'DGJB5AQV',
    name: '
    address: '厦门市集美区集美大道',
    code: 'XM-JM-001',
    manager: '陈伟',
    phone: '0592-77776666',
    status: 'active',
    distributorIds: ['13', '14']
  },
  {
    id: '15',
    distributorId: 'D1DGHAQI',
    name: '
    address: '苏州市工业园区星湖街',
    code: 'SZ-GY-001',
    manager: '李强',
    phone: '0512-66665555',
    status: 'active',
    distributorIds: ['14', '15']
  },
  {
    id: '16',
    distributorId: 'DUV17TTQ',
    name: '
    address: '无锡市滨湖区太湖大道',
    code: 'WX-TH-001',
    manager: '王敏',
    phone: '0510-55554444',
    status: 'active',
    distributorIds: ['15', '16']
  }
];

const mockItemCategories = [
  {
    id: '1',
    distributorId: 'DBABSEFN',
    name: '
    description: '用于进出工地、办公室等场所的门禁卡',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: '钥匙',
    description: '各种门锁、柜子、工具箱等的钥匙',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: '梯子',
    description: '各种高度和类型的梯子，用于高空作业',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    name: '安全帽',
    description: '工地安全防护用品，各种颜色和尺寸',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '5',
    name: '工具',
    description: '各种手动和电动工具，如扳手、电钻等',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '6',
    name: '防护用品',
    description: '安全眼镜、手套、口罩等个人防护用品',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '7',
    name: '测量设备',
    description: '卷尺、水平仪、激光测距仪等测量工具',
    status: 'active',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  },
  {
    id: '8',
    name: '通信设备',
    description: '对讲机、电话、平板电脑等通信工具',
    status: 'inactive',
    createTime: '2024-01-01T00:00:00Z',
    updateTime: '2024-01-01T00:00:00Z'
  }
];

async function main() {
  console.log('开始插入静态数据...');

  try {
    // 1. 创建分销商用户和分销商记录
    console.log('创建分销商数据...');
    for (const distributorData of mockDistributors) {
      // 创建分销商用户
      const hashedPassword = await bcrypt.hash('distributor123', 10);
      const distributorUser = await prisma.user.create({
        data: {
          username: distributorData.accountUsername,
          password: hashedPassword,
          role: 'DISTRIBUTOR',
          status: distributorData.accountStatus === 'active' ? 'ACTIVE' : 'DISABLED',
        },
      });

      // 创建分销商记录
      await prisma.distributor.create({
        data: {
          id: distributorData.id,
          distributorId: distributorData.distributorId,
          name: distributorData.name,
          contactName: distributorData.contactName,
          phone: distributorData.phone,
          email: distributorData.email,
          userId: distributorUser.id,
        },
      });
    }

    // 2. 创建工地记录
    console.log('创建工地数据...');
    for (const siteData of mockSites) {
      await prisma.site.create({
        data: {
          id: siteData.id,
          name: siteData.name,
          address: siteData.address,
          code: siteData.code,
          manager: siteData.manager,
          phone: siteData.phone,
          status: siteData.status.toUpperCase() as any,
        },
      });
    }

    // 3. 创建工地-分销商关联关系
    console.log('创建工地-分销商关联关系...');
    for (const siteData of mockSites) {
      for (const distributorId of siteData.distributorIds) {
        await prisma.siteDistributor.create({
          data: {
            siteId: siteData.id,
            distributorId: distributorId,
          },
        });
      }
    }

    // 4. 创建门卫用户和门卫记录
    console.log('创建门卫数据...');
    const mockGuards = [
      {
        id: '1',
        guardId: 'G001',
        name: '张保安',
        siteId: '1',
        phone: '13800138001',
        email: 'zhangbaoan@site1.com',
        whatsapp: '+86 13800138001',
        accountUsername: 'guard001',
        accountStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        guardId: 'G002',
        name: '李门卫',
        siteId: '1',
        phone: '13800138002',
        email: 'limenwei@site1.com',
        whatsapp: '+86 13800138002',
        accountUsername: 'guard002',
        accountStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '3',
        guardId: 'G003',
        name: '王警卫',
        siteId: '2',
        phone: '13800138003',
        email: 'wangjingwei@site2.com',
        whatsapp: '+86 13800138003',
        accountUsername: 'guard003',
        accountStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '4',
        guardId: 'G004',
        name: '陈守门',
        siteId: '2',
        phone: '13800138004',
        email: 'chenshoumen@site2.com',
        whatsapp: '+86 13800138004',
        accountUsername: 'guard004',
        accountStatus: 'disabled',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: '5',
        guardId: 'G005',
        name: '刘看门',
        siteId: '3',
        phone: '13800138005',
        email: 'liukanmen@site3.com',
        whatsapp: '+86 13800138005',
        accountUsername: 'guard005',
        accountStatus: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ];

    for (const guardData of mockGuards) {
      // 创建门卫用户
      const hashedPassword = await bcrypt.hash('guard123', 10);
      const guardUser = await prisma.user.create({
        data: {
          username: guardData.accountUsername,
          password: hashedPassword,
          role: 'GUARD',
          status: guardData.accountStatus === 'active' ? 'ACTIVE' : 'DISABLED',
        },
      });

      // 创建门卫记录
      await prisma.guard.create({
        data: {
          id: guardData.id,
          guardId: guardData.guardId,
          name: guardData.name,
          siteId: guardData.siteId,
          phone: guardData.phone,
          email: guardData.email,
          whatsapp: guardData.whatsapp,
          userId: guardUser.id,
        },
      });
    }

    // 5. 创建物品分类
    console.log('创建物品分类数据...');
    for (const categoryData of mockItemCategories) {
      await prisma.itemCategory.create({
        data: {
          id: categoryData.id,
          name: categoryData.name,
          description: categoryData.description,
          status: categoryData.status.toUpperCase() as any,
        },
      });
    }

    // 6. 创建工人数据（部分示例数据）
    console.log('创建工人数据...');
    const sampleWorkers = [
      {
        id: '1',
        workerId: 'WK001',
        name: '张三',
        gender: 'male',
        idCard: '110101199001011234',
        region: '中国大陆',
        photo: '',
        distributorId: '1',
        siteId: '1',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        whatsapp: '+86 13800138001',
        birthDate: '1990-01-01',
        age: 34,
        physicalCardId: 'CARD001',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        workerId: 'WK002',
        name: '李四',
        gender: 'male',
        idCard: '310101199002021234',
        region: '中国大陆',
        photo: '',
        distributorId: '2',
        siteId: '2',
        phone: '13800138002',
        email: 'lisi@example.com',
        whatsapp: '+86 13800138002',
        birthDate: '1990-02-02',
        age: 34,
        physicalCardId: 'CARD002',
        status: 'active',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        workerId: 'WK003',
        name: '王五',
        gender: 'male',
        idCard: '440101199003031234',
        region: '中国大陆',
        photo: '',
        distributorId: '3',
        siteId: '3',
        phone: '13800138003',
        email: 'wangwu@example.com',
        whatsapp: '+86 13800138003',
        birthDate: '1990-03-03',
        age: 34,
        physicalCardId: 'CARD003',
        status: 'suspended',
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      }
    ];

    for (const workerData of sampleWorkers) {
      await prisma.worker.create({
        data: {
          id: workerData.id,
          workerId: workerData.workerId,
          name: workerData.name,
          gender: workerData.gender.toUpperCase() as any,
          idCard: workerData.idCard,
          region: workerData.region,
          photo: workerData.photo,
          distributorId: workerData.distributorId,
          siteId: workerData.siteId,
          phone: workerData.phone,
          email: workerData.email,
          whatsapp: workerData.whatsapp,
          birthDate: new Date(workerData.birthDate),
          age: workerData.age,
          physicalCardId: workerData.physicalCardId,
          status: workerData.status.toUpperCase() as any,
        },
      });
    }

    console.log('静态数据插入完成！');
    console.log(`- 分销商: ${mockDistributors.length} 个`);
    console.log(`- 工地: ${mockSites.length} 个`);
    console.log(`- 门卫: ${mockGuards.length} 个`);
    console.log(`- 物品分类: ${mockItemCategories.length} 个`);
    console.log(`- 工人: ${sampleWorkers.length} 个（示例数据）`);

  } catch (error) {
    console.error('插入静态数据时出错:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
