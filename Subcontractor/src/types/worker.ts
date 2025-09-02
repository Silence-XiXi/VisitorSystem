export interface Worker {
  id: string;
  workerId: string; // 工人唯一编号
  name: string; // 姓名
  gender: 'male' | 'female'; // 性别
  idCard: string; // 身份证号
  region: string; // 地区
  photo: string; // 照片URL
  distributorId: string; // 分判商ID
  siteId: string; // 所属工地ID
  phone: string; // 联系电话
  email: string; // 邮箱
  whatsapp: string; // WhatsApp
  birthDate?: string; // 出生日期 ISO 字符串 YYYY-MM-DD
  age?: number; // 年龄（根据出生日期计算）
  physicalCardId?: string; // 实体卡编号（每日发放，非固定）
  status: 'active' | 'inactive' | 'suspended'; // 状态
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  workerId: string;
  name: string;
  gender: 'male' | 'female';
  idCard: string;
  region: string;
  photo?: string;
  distributorId: string;
  siteId: string;
  phone: string;
  email: string;
  whatsapp: string;
  birthDate: string;
  age: number;
  physicalCardId?: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {
  id: string;
}

export interface Distributor {
  id: string;
  name: string;
  code: string;
  contactName?: string; // 联系人
  phone?: string; // 联系电话
  email?: string; // 邮箱
  accountUsername?: string; // 账号
  accountStatus?: 'active' | 'disabled'; // 账号状态
}

export interface Site {
  id: string;
  name: string;
  address: string;
  code: string;
  manager?: string; // 负责人
  phone?: string; // 联系电话
  status?: 'active' | 'inactive' | 'suspended'; // 状态
}
