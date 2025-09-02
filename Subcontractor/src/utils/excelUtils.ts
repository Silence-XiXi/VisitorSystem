import * as XLSX from 'xlsx';
import { Worker, CreateWorkerRequest } from '../types/worker';

// Excel列映射配置
export const EXCEL_COLUMNS = {
  workerId: '工人编号',
  name: '姓名',
  gender: '性别',
  idCard: '身份证号',
  region: '地区',
  distributorId: '分判商ID',
  siteId: '工地ID',
  phone: '联系电话',
  email: '邮箱',
  whatsapp: 'WhatsApp',
  status: '状态'
};

// 性别映射
export const GENDER_MAP = {
  '男': 'male',
  '女': 'female',
  'male': 'male',
  'female': 'female'
};

// 状态映射
export const STATUS_MAP = {
  '在职': 'active',
  '暂停': 'suspended',
  '离职': 'inactive',
  'active': 'active',
  'suspended': 'suspended',
  'inactive': 'inactive'
};

// 地区映射
export const REGION_MAP = {
  '中国大陆': '中国大陆',
  '中国香港': '中国香港',
  '中国澳门': '中国澳门',
  '中国台湾': '中国台湾',
  '其他': '其他'
};

// 验证必填字段
export const validateRequiredFields = (data: any): string[] => {
  const errors: string[] = [];
  const requiredFields = ['workerId', 'name', 'gender', 'idCard', 'region', 'distributorId', 'siteId', 'phone', 'email', 'whatsapp', 'status'];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${EXCEL_COLUMNS[field as keyof typeof EXCEL_COLUMNS]}不能为空`);
    }
  });
  
  return errors;
};

// 验证数据格式
export const validateDataFormat = (data: any): string[] => {
  const errors: string[] = [];
  
  // 验证身份证号格式
  if (data.idCard && !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(data.idCard)) {
    errors.push('身份证号格式不正确');
  }
  
  // 验证手机号格式
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
    errors.push('手机号格式不正确');
  }
  
  // 验证邮箱格式
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('邮箱格式不正确');
  }
  
  // 验证性别
  if (data.gender && !Object.keys(GENDER_MAP).includes(data.gender)) {
    errors.push('性别只能是：男/女');
  }
  
  // 验证状态
  if (data.status && !Object.keys(STATUS_MAP).includes(data.status)) {
    errors.push('状态只能是：在职/暂停/离职');
  }
  
  // 验证地区
  if (data.region && !Object.keys(REGION_MAP).includes(data.region)) {
    errors.push('地区只能是：中国大陆/中国香港/中国澳门/中国台湾/其他');
  }
  
  return errors;
};

// 转换Excel数据为工人对象
export const convertExcelToWorker = (row: any, rowIndex: number): { data: CreateWorkerRequest; errors: string[] } => {
  const errors: string[] = [];
  
  // 数据清洗和转换
  const workerData = {
    workerId: String(row.workerId || '').trim(),
    name: String(row.name || '').trim(),
    gender: GENDER_MAP[row.gender as keyof typeof GENDER_MAP] || row.gender,
    idCard: String(row.idCard || '').trim(),
    region: REGION_MAP[row.region as keyof typeof REGION_MAP] || row.region,
    distributorId: String(row.distributorId || '').trim(),
    siteId: String(row.siteId || '').trim(),
    phone: String(row.phone || '').trim(),
    email: String(row.email || '').trim(),
    whatsapp: String(row.whatsapp || '').trim(),
    status: STATUS_MAP[row.status as keyof typeof STATUS_MAP] || row.status
  };
  
  // 验证必填字段
  const requiredErrors = validateRequiredFields(workerData);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 验证数据格式
  const formatErrors = validateDataFormat(workerData);
  errors.push(...formatErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: workerData, errors };
};

// 读取Excel文件
export const readExcelFile = (file: File): Promise<{ workers: CreateWorkerRequest[]; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          resolve({ workers: [], errors: ['Excel文件至少需要包含标题行和一行数据'] });
          return;
        }
        
        // 获取标题行
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        const workers: CreateWorkerRequest[] = [];
        const allErrors: string[] = [];
        
        dataRows.forEach((row: any, index) => {
          if (row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            // 将行数据转换为对象
            const rowData: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                rowData[header] = row[colIndex];
              }
            });
            
            const { data, errors } = convertExcelToWorker(rowData, index + 1);
            if (errors.length === 0) {
              workers.push(data);
            } else {
              allErrors.push(...errors);
            }
          }
        });
        
        resolve({ workers, errors: allErrors });
      } catch (error) {
        reject(new Error('Excel文件读取失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 导出工人数据到Excel
export const exportWorkersToExcel = (workers: Worker[], distributors: any[], sites: any[]) => {
  // 准备导出数据
  const exportData = workers.map(worker => {
    const distributor = distributors.find(d => d.id === worker.distributorId);
    const site = sites.find(s => s.id === worker.siteId);
    
    return {
      [EXCEL_COLUMNS.workerId]: worker.workerId,
      [EXCEL_COLUMNS.name]: worker.name,
      [EXCEL_COLUMNS.gender]: worker.gender === 'male' ? '男' : '女',
      [EXCEL_COLUMNS.idCard]: worker.idCard,
      [EXCEL_COLUMNS.region]: worker.region,
      [EXCEL_COLUMNS.distributorId]: distributor?.name || worker.distributorId,
      [EXCEL_COLUMNS.siteId]: site?.name || worker.siteId,
      [EXCEL_COLUMNS.phone]: worker.phone,
      [EXCEL_COLUMNS.email]: worker.email,
      [EXCEL_COLUMNS.whatsapp]: worker.whatsapp,
      [EXCEL_COLUMNS.status]: worker.status === 'active' ? '在职' : worker.status === 'suspended' ? '暂停' : '离职'
    };
  });
  
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // 设置列宽
  const colWidths = [
    { wch: 15 }, // 工人编号
    { wch: 10 }, // 姓名
    { wch: 8 },  // 性别
    { wch: 20 }, // 身份证号
    { wch: 15 }, // 地区
    { wch: 15 }, // 分判商
    { wch: 15 }, // 工地
    { wch: 15 }, // 电话
    { wch: 25 }, // 邮箱
    { wch: 15 }, // WhatsApp
    { wch: 10 }  // 状态
  ];
  worksheet['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '工人信息');
  
  // 生成文件名
  const fileName = `工人信息_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};

// 生成导入模板
export const generateImportTemplate = () => {
  // 模板数据
  const templateData = [
    {
      [EXCEL_COLUMNS.workerId]: 'WK001',
      [EXCEL_COLUMNS.name]: '张三',
      [EXCEL_COLUMNS.gender]: '男',
      [EXCEL_COLUMNS.idCard]: '110101199001011234',
      [EXCEL_COLUMNS.region]: '中国大陆',
      [EXCEL_COLUMNS.distributorId]: '分判商A',
      [EXCEL_COLUMNS.siteId]: '工地A',
      [EXCEL_COLUMNS.phone]: '13800138001',
      [EXCEL_COLUMNS.email]: 'zhangsan@example.com',
      [EXCEL_COLUMNS.whatsapp]: '+86 13800138001',
      [EXCEL_COLUMNS.status]: '在职'
    },
    {
      [EXCEL_COLUMNS.workerId]: 'WK002',
      [EXCEL_COLUMNS.name]: '李四',
      [EXCEL_COLUMNS.gender]: '女',
      [EXCEL_COLUMNS.idCard]: '310101199002021234',
      [EXCEL_COLUMNS.region]: '中国香港',
      [EXCEL_COLUMNS.distributorId]: '分判商B',
      [EXCEL_COLUMNS.siteId]: '工地B',
      [EXCEL_COLUMNS.phone]: '13800138002',
      [EXCEL_COLUMNS.email]: 'lisi@example.com',
      [EXCEL_COLUMNS.whatsapp]: '+852 13800138002',
      [EXCEL_COLUMNS.status]: '在职'
    }
  ];
  
  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  // 设置列宽
  const colWidths = [
    { wch: 15 }, // 工人编号
    { wch: 10 }, // 姓名
    { wch: 8 },  // 性别
    { wch: 20 }, // 身份证号
    { wch: 15 }, // 地区
    { wch: 15 }, // 分判商
    { wch: 15 }, // 工地
    { wch: 15 }, // 电话
    { wch: 25 }, // 邮箱
    { wch: 15 }, // WhatsApp
    { wch: 10 }  // 状态
  ];
  worksheet['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '工人信息导入模板');
  
  // 生成文件名
  const fileName = '工人信息导入模板.xlsx';
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};
