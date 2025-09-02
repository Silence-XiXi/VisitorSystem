import { Distributor, Site, Worker } from '../types/worker';

// 模拟分判商数据
export const mockDistributors: Distributor[] = [
  {
    id: '1',
    name: '北京建筑公司',
    code: 'BJ001',
    contactName: '刘强',
    phone: '010-88888888',
    email: 'contact-bj@corp.com',
    accountUsername: 'bjadmin',
    accountStatus: 'active'
  },
  {
    id: '2',
    name: '上海工程集团',
    code: 'SH001',
    contactName: '王芳',
    phone: '021-66666666',
    email: 'contact-sh@corp.com',
    accountUsername: 'shadmin',
    accountStatus: 'active'
  },
  {
    id: '3',
    name: '广州建设有限公司',
    code: 'GZ001',
    contactName: '李明',
    phone: '020-77777777',
    email: 'contact-gz@corp.com',
    accountUsername: 'gzadmin',
    accountStatus: 'disabled'
  },
  {
    id: '4',
    name: '深圳建筑集团',
    code: 'SZ001',
    contactName: '周婷',
    phone: '0755-12345678',
    email: 'contact-sz@corp.com',
    accountUsername: 'szadmin',
    accountStatus: 'active'
  },
  {
    id: '5',
    name: '杭州城建集团',
    code: 'HZ001',
    contactName: '钱勇',
    phone: '0571-99999999',
    email: 'contact-hz@corp.com',
    accountUsername: 'hzadmin',
    accountStatus: 'active'
  },
  {
    id: '6',
    name: '成都建工集团',
    code: 'CD001',
    contactName: '孙伟',
    phone: '028-55555555',
    email: 'contact-cd@corp.com',
    accountUsername: 'cdadmin',
    accountStatus: 'active'
  }
];

// 模拟工地数据
export const mockSites: Site[] = [
  {
    id: '1',
    name: '北京CBD项目',
    address: '北京市朝阳区CBD核心区',
    code: 'BJ-CBD-001',
    manager: '赵强',
    phone: '010-88886666',
    status: 'active'
  },
  {
    id: '2',
    name: '上海浦东项目',
    address: '上海市浦东新区陆家嘴',
    code: 'SH-PD-001',
    manager: '钱恒',
    phone: '021-68686868',
    status: 'active'
  },
  {
    id: '3',
    name: '广州天河项目',
    address: '广州市天河区珠江新城',
    code: 'GZ-TH-001',
    manager: '孙丽',
    phone: '020-78787878',
    status: 'suspended'
  },
  {
    id: '4',
    name: '深圳南山项目',
    address: '深圳市南山区科技园',
    code: 'SZ-NS-001',
    manager: '李雷',
    phone: '0755-13579246',
    status: 'active'
  },
  {
    id: '5',
    name: '杭州西湖项目',
    address: '杭州市西湖区西湖景区',
    code: 'HZ-XH-001',
    manager: '王芳',
    phone: '0571-24681357',
    status: 'inactive'
  },
  {
    id: '6',
    name: '成都天府项目',
    address: '成都市天府新区天府大道',
    code: 'CD-TF-001',
    manager: '陈刚',
    phone: '028-12344321',
    status: 'active'
  }
];

// 模拟工人数据
export const mockWorkers: Worker[] = [
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
    photo: '',
    distributorId: '4',
    siteId: '4',
    phone: '13800138004',
    email: 'zhaoliu@example.com',
    whatsapp: '+86 13800138004',
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
    photo: '',
    distributorId: '1',
    siteId: '1',
    phone: '13800138007',
    email: 'zhoujiu@example.com',
    whatsapp: '+86 13800138007',
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
    photo: '',
    distributorId: '2',
    siteId: '2',
    phone: '13800138008',
    email: 'wushi@example.com',
    whatsapp: '+852 13800138008',
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
    photo: '',
    distributorId: '3',
    siteId: '3',
    phone: '13800138009',
    email: 'zhengshiyi@example.com',
    whatsapp: '+853 13800138009',
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
    photo: '',
    distributorId: '4',
    siteId: '4',
    phone: '13800138010',
    email: 'wangshier@example.com',
    whatsapp: '+886 13800138010',
    status: 'active',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  }
];

// 获取分判商名称
export const getDistributorName = (distributorId: string): string => {
  const distributor = mockDistributors.find(d => d.id === distributorId);
  return distributor?.name || '未知';
};

// 获取工地名称
export const getSiteName = (siteId: string): string => {
  const site = mockSites.find(s => s.id === siteId);
  return site?.name || '未知';
};

// 获取工地地址
export const getSiteAddress = (siteId: string): string => {
  const site = mockSites.find(s => s.id === siteId);
  return site?.address || '未知';
};

// 根据状态获取工人数量
export const getWorkerCountByStatus = (status: string): number => {
  return mockWorkers.filter(worker => worker.status === status).length;
};

// 根据分判商获取工人数量
export const getWorkerCountByDistributor = (distributorId: string): number => {
  return mockWorkers.filter(worker => worker.distributorId === distributorId).length;
};

// 根据工地获取工人数量
export const getWorkerCountBySite = (siteId: string): number => {
  return mockWorkers.filter(worker => worker.siteId === siteId).length;
};
