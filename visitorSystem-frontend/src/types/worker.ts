export interface Worker {
  id: string;
  workerId: string; // 工人唯一编号
  name: string; // 姓名
  gender: 'MALE' | 'FEMALE'; // 性别
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER'; // 证件类型
  idNumber: string; // 证件号码
  region: string; // 地区
  distributorId: string; // 分判商ID
  siteId: string; // 所属工地ID
  phone: string; // 联系电话
  email: string; // 邮箱
  whatsapp: string; // WhatsApp
  birthDate?: string; // 出生日期 ISO 字符串 YYYY-MM-DD
  status: 'ACTIVE' | 'INACTIVE' | 'active' | 'inactive'; // 状态
  createdAt: string;
  updatedAt: string;
  distributor?: {
    id: string;
    distributorId: string; // 分判商编号
    name: string;
  };
  site?: {
    id: string;
    name: string;
    code?: string; // 工地编号
  };
}

export interface CreateWorkerRequest {
  name: string;
  gender: string; // 改为string类型，支持任意值
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber: string;
  region: string;
  distributorId: string;
  siteId: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  birthDate?: string;
  status: string; // 改为string类型，支持任意值
  workerId?: string; // 工人编号，可选，系统会自动生成
}

export interface UpdateWorkerRequest extends Partial<CreateWorkerRequest> {
  id: string;
}

export interface WorkerFormData {
  name: string;
  gender: string;
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';
  idNumber: string;
  region: string;
  areaCode: string; // 地区区号
  phone: string;
  email?: string;
  whatsapp?: string;
  birthDate?: any; // dayjs对象
}

export interface Distributor {
  id: string;
  distributorId: string; // 分判商编号
  name: string;
  siteIds?: string[]; // 服务的工地ID列表（多对多关系）
  sites?: Array<{
    site: Site;
  }>; // 关联的工地信息
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
  code?: string; // 改为可选
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
