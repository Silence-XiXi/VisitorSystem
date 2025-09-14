export interface Worker {
  id: string;
  workerId: string; // 工人唯一编号
  name: string; // 姓名
  gender: 'MALE' | 'FEMALE'; // 性别
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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'; // 状态
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  name: string;
  gender: 'MALE' | 'FEMALE';
  idCard: string;
  region: string;
  photo?: string;
  distributorId: string;
  siteId: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  birthDate?: string;
  age?: number;
  physicalCardId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {
  id: string;
}

export interface Distributor {
  id: string;
  distributorId: string; // 分判商编号
  name: string;
  siteIds?: string[]; // 服务的工地ID列表（多对多关系）
  contactName?: string; // 联系人
  phone?: string; // 联系电话
  email?: string; // 邮箱
  whatsapp?: string; // WhatsApp号码
  accountUsername?: string; // 账号
  accountStatus?: 'active' | 'disabled'; // 账号状态
  userId?: string; // 关联的用户ID
}

export interface Site {
  id: string;
  name: string;
  address: string;
  code: string;
  manager?: string; // 负责人
  phone?: string; // 联系电话
  status?: 'active' | 'inactive' | 'suspended'; // 状态
  distributorIds?: string[]; // 关联的分判商ID列表（多对多关系）
}

export interface Guard {
  id: string;
  guardId: string; // 门卫编号
  name: string;
  siteId: string; // 所属工地ID
  phone: string; // 联系电话
  email?: string; // 邮箱
  whatsapp?: string; // WhatsApp
  accountUsername?: string; // 账号
  accountStatus?: 'active' | 'disabled'; // 账号状态
  createdAt: string;
  updatedAt: string;
  userId?: string; // 关联的用户ID
}

export interface CreateGuardRequest {
  guardId: string;
  name: string;
  siteId: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  accountUsername?: string;
  accountStatus?: 'active' | 'disabled';
  defaultPassword?: string;
}

export interface UpdateGuardRequest extends Partial<CreateGuardRequest> {
  id: string;
}
