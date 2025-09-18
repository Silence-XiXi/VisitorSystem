import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 前端mockData.ts中的所有工人数据
const mockWorkers = [
  {
    id: '1',
    workerId: 'WK001',
    name: '张三',
    gender: 'male',
    idCard: '110101199001011234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138001',
    email: 'zhangsan@example.com',
    whatsapp: '+86 13800138001',
    birthDate: '1990-01-01',
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
    distributorId: '2',
    siteId: '2',
    phone: '13800138002',
    email: 'lisi@example.com',
    whatsapp: '+86 13800138002',
    birthDate: '1990-02-02',
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
    distributorId: '3',
    siteId: '3',
    phone: '13800138003',
    email: 'wangwu@example.com',
    whatsapp: '+86 13800138003',
    birthDate: '1990-03-03',
    status: 'suspended',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    workerId: 'WK004',
    name: '赵六',
    gender: 'female',
    idCard: '440301199004041234',
    region: '中国大陆',
    distributorId: '4',
    siteId: '4',
    phone: '13800138004',
    email: 'zhaoliu@example.com',
    whatsapp: '+86 13800138004',
    birthDate: '1990-04-04',
    status: 'active',
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
  },
  {
    id: '5',
    workerId: 'WK005',
    name: '钱七',
    gender: 'male',
    idCard: '330101199005051234',
    region: '中国大陆',
    photo: '',
    distributorId: '5',
    siteId: '5',
    phone: '13800138005',
    email: 'qianqi@example.com',
    whatsapp: '+86 13800138005',
    birthDate: '1990-05-05',
    status: 'active',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-05T00:00:00Z',
  },
  {
    id: '6',
    workerId: 'WK006',
    name: '孙八',
    gender: 'female',
    idCard: '510101199006061234',
    region: '中国大陆',
    photo: '',
    distributorId: '6',
    siteId: '6',
    phone: '13800138006',
    email: 'sunba@example.com',
    whatsapp: '+86 13800138006',
    birthDate: '1990-06-06',
    status: 'inactive',
    createdAt: '2024-01-06T00:00:00Z',
    updatedAt: '2024-01-06T00:00:00Z',
  },
  {
    id: '7',
    workerId: 'WK007',
    name: '周九',
    gender: 'male',
    idCard: '110101199007071234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138007',
    email: 'zhoujiu@example.com',
    whatsapp: '+86 13800138007',
    birthDate: '1990-07-07',
    status: 'active',
    createdAt: '2024-01-07T00:00:00Z',
    updatedAt: '2024-01-07T00:00:00Z',
  },
  {
    id: '8',
    workerId: 'WK008',
    name: '吴十',
    gender: 'female',
    idCard: '310101199008081234',
    region: '中国香港',
    distributorId: '2',
    siteId: '2',
    phone: '13800138008',
    email: 'wushi@example.com',
    whatsapp: '+852 13800138008',
    birthDate: '1990-08-08',
    status: 'active',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: '9',
    workerId: 'WK009',
    name: '郑十一',
    gender: 'male',
    idCard: '440101199009091234',
    region: '中国澳门',
    distributorId: '3',
    siteId: '3',
    phone: '13800138009',
    email: 'zhengshiyi@example.com',
    whatsapp: '+853 13800138009',
    birthDate: '1990-09-09',
    status: 'suspended',
    createdAt: '2024-01-09T00:00:00Z',
    updatedAt: '2024-01-09T00:00:00Z',
  },
  {
    id: '10',
    workerId: 'WK010',
    name: '王十二',
    gender: 'female',
    idCard: '440301199010101234',
    region: '中国台湾',
    distributorId: '4',
    siteId: '4',
    phone: '13800138010',
    email: 'wangshier@example.com',
    whatsapp: '+886 13800138010',
    birthDate: '1990-10-10',
    status: 'active',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  // 北京建筑公司新增工人数据
  {
    id: '12',
    workerId: 'WK012',
    name: '刘建国',
    gender: 'male',
    idCard: '110101198501151234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138012',
    email: 'liujianguo@bjcorp.com',
    whatsapp: '+86 13800138012',
    birthDate: '1985-01-15',
    status: 'active',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
  {
    id: '13',
    workerId: 'WK013',
    name: '陈美丽',
    gender: 'female',
    idCard: '110101198803201234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138013',
    email: 'chenmeili@bjcorp.com',
    whatsapp: '+86 13800138013',
    birthDate: '1988-03-20',
    status: 'active',
    createdAt: '2024-01-13T00:00:00Z',
    updatedAt: '2024-01-13T00:00:00Z',
  },
  {
    id: '14',
    workerId: 'WK014',
    name: '张伟强',
    gender: 'male',
    idCard: '110101199205101234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '2',
    phone: '13800138014',
    email: 'zhangweiqiang@bjcorp.com',
    whatsapp: '+86 13800138014',
    birthDate: '1992-05-10',
    status: 'active',
    createdAt: '2024-01-14T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
  {
    id: '15',
    workerId: 'WK015',
    name: '李小红',
    gender: 'female',
    idCard: '110101199007251234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138015',
    email: 'lixiaohong@bjcorp.com',
    whatsapp: '+86 13800138015',
    birthDate: '1990-07-25',
    status: 'suspended',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '16',
    workerId: 'WK016',
    name: '王大力',
    gender: 'male',
    idCard: '110101198612051234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '2',
    phone: '13800138016',
    email: 'wangdali@bjcorp.com',
    whatsapp: '+86 13800138016',
    birthDate: '1986-12-05',
    status: 'active',
    createdAt: '2024-01-16T00:00:00Z',
    updatedAt: '2024-01-16T00:00:00Z',
  },
  {
    id: '17',
    workerId: 'WK017',
    name: '赵敏',
    gender: 'female',
    idCard: '110101199308151234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138017',
    email: 'zhaomin@bjcorp.com',
    whatsapp: '+86 13800138017',
    birthDate: '1993-08-15',
    status: 'active',
    createdAt: '2024-01-17T00:00:00Z',
    updatedAt: '2024-01-17T00:00:00Z',
  },
  {
    id: '18',
    workerId: 'WK018',
    name: '孙志强',
    gender: 'male',
    idCard: '110101198904201234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '2',
    phone: '13800138018',
    email: 'sunzhiqiang@bjcorp.com',
    whatsapp: '+86 13800138018',
    birthDate: '1989-04-20',
    status: 'active',
    createdAt: '2024-01-18T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
  {
    id: '19',
    workerId: 'WK019',
    name: '周丽华',
    gender: 'female',
    idCard: '110101199111101234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138019',
    email: 'zhoulihua@bjcorp.com',
    whatsapp: '+86 13800138019',
    birthDate: '1991-11-10',
    status: 'inactive',
    createdAt: '2024-01-19T00:00:00Z',
    updatedAt: '2024-01-19T00:00:00Z',
  },
  {
    id: '20',
    workerId: 'WK020',
    name: '王志强',
    gender: 'male',
    idCard: '110101198703151234',
    region: '中国大陆',
    distributorId: '1',
    siteId: '1',
    phone: '13800138020',
    email: 'wangzhiqiang@bjcorp.com',
    whatsapp: '+86 13800138020',
    birthDate: '1987-03-15',
    status: 'active',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  }
];

async function main() {
  console.log('开始插入工人数据...');

  try {
    // 获取现有的分判商和工地
    const distributors = await prisma.distributor.findMany();
    const sites = await prisma.site.findMany();

    console.log(`找到分判商: ${distributors.length} 个`);
    console.log(`找到工地: ${sites.length} 个`);

    if (distributors.length === 0 || sites.length === 0) {
      console.log('请先运行基础种子数据脚本创建分判商和工地');
      return;
    }

    // 使用第一个分判商和工地的ID
    const defaultDistributorId = distributors[0].id;
    const defaultSiteId = sites[0].id;

    console.log(`使用分判商ID: ${defaultDistributorId}`);
    console.log(`使用工地ID: ${defaultSiteId}`);

    // 检查现有的工人数据
    const existingWorkers = await prisma.worker.findMany();
    console.log(`现有工人: ${existingWorkers.length} 个`);

    // 插入新的工人数据，使用实际的ID
    for (let i = 0; i < mockWorkers.length; i++) {
      const workerData = mockWorkers[i];
      const workerId = `WK${String(i + 1).padStart(3, '0')}`;
      
      // 检查工人编号是否已存在
      const existingWorker = await prisma.worker.findUnique({
        where: { workerId: workerId }
      });

      if (existingWorker) {
        console.log(`工人 ${workerId} 已存在，跳过`);
        continue;
      }

      await prisma.worker.create({
        data: {
          workerId: workerId,
          name: workerData.name,
          gender: workerData.gender.toUpperCase() as any,
          idType: 'ID_CARD',
          idNumber: workerData.idCard,
          region: workerData.region,
          distributorId: defaultDistributorId,
          siteId: defaultSiteId,
          phone: workerData.phone,
          email: workerData.email,
          whatsapp: workerData.whatsapp,
          birthDate: new Date(workerData.birthDate),
          status: workerData.status === 'suspended' ? 'INACTIVE' : workerData.status.toUpperCase() as any,
        },
      });

      console.log(`创建工人: ${workerData.name} (${workerId})`);
    }

    console.log('工人数据插入完成！');

  } catch (error) {
    console.error('插入工人数据时出错:', error);
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
