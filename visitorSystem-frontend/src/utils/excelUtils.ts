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

// 生成工人导入模板（分判商专用）
export const generateWorkerImportTemplate = () => {
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
      [EXCEL_COLUMNS.region]: '中国大陆',
      [EXCEL_COLUMNS.distributorId]: '分判商A',
      [EXCEL_COLUMNS.siteId]: '工地A',
      [EXCEL_COLUMNS.phone]: '13800138002',
      [EXCEL_COLUMNS.email]: 'lisi@example.com',
      [EXCEL_COLUMNS.whatsapp]: '+86 13800138002',
      [EXCEL_COLUMNS.status]: '在职'
    }
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  const colWidths = [
    { wch: 15 }, // 工人编号
    { wch: 12 }, // 姓名
    { wch: 8 },  // 性别
    { wch: 20 }, // 身份证号
    { wch: 12 }, // 地区
    { wch: 15 }, // 分判商ID
    { wch: 15 }, // 工地ID
    { wch: 15 }, // 联系电话
    { wch: 25 }, // 邮箱
    { wch: 18 }, // WhatsApp
    { wch: 8 }   // 状态
  ];

  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, '工人信息模板');

  const fileName = '工人信息导入模板.xlsx';
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};

// 读取工人Excel文件（分判商专用）
export const readWorkerExcelFile = (file: File): Promise<{ workers: CreateWorkerRequest[]; errors: string[] }> => {
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
          resolve({ workers: [], errors: ['Excel文件为空或格式不正确'] });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const workers: CreateWorkerRequest[] = [];
        const allErrors: string[] = [];
        
        // 处理数据行
        jsonData.slice(1).forEach((row: any[], index: number) => {
          if (row.every(cell => cell === undefined || cell === '')) {
            return; // 跳过空行
          }
          
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

// 工地Excel列映射配置
export const SITE_EXCEL_COLUMNS = {
  code: '编码',
  name: '名称',
  address: '地址',
  manager: '负责人',
  phone: '联系电话',
  status: '状态'
};

// 分判商Excel列映射配置
export const DISTRIBUTOR_EXCEL_COLUMNS = {
  id: '分判商编号',
  name: '名称',
  contactName: '联系人',
  phone: '电话',
  email: '邮箱',
  whatsapp: 'WhatsApp',
  siteIds: '服务工地',
  accountUsername: '账号',
  accountStatus: '账号状态'
};

// 工地状态映射
export const SITE_STATUS_MAP = {
  '启用': 'active',
  '暂停': 'suspended',
  '停用': 'inactive',
  'active': 'active',
  'suspended': 'suspended',
  'inactive': 'inactive'
};

// 分判商账号状态映射
export const DISTRIBUTOR_STATUS_MAP = {
  '启用': 'active',
  '禁用': 'disabled',
  'active': 'active',
  'disabled': 'disabled'
};

// 验证工地必填字段
export const validateSiteRequiredFields = (data: any): string[] => {
  const errors: string[] = [];
  const requiredFields = ['name', 'address'];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${SITE_EXCEL_COLUMNS[field as keyof typeof SITE_EXCEL_COLUMNS]}不能为空`);
    }
  });
  
  return errors;
};

// 验证分判商必填字段
export const validateDistributorRequiredFields = (data: any): string[] => {
  const errors: string[] = [];
  const requiredFields = ['name', 'accountUsername'];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${DISTRIBUTOR_EXCEL_COLUMNS[field as keyof typeof DISTRIBUTOR_EXCEL_COLUMNS]}不能为空`);
    }
  });
  
  return errors;
};

// 转换Excel数据为工地对象
export const convertExcelToSite = (row: any, rowIndex: number): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  // 尝试不同的列名映射
  const getValue = (key: string, fallbackKeys: string[] = []) => {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]).trim();
    }
    for (const fallbackKey of fallbackKeys) {
      if (row[fallbackKey] !== undefined && row[fallbackKey] !== null && row[fallbackKey] !== '') {
        return String(row[fallbackKey]).trim();
      }
    }
    return '';
  };
  
  const siteData = {
    code: getValue('编码', ['code', '编号', '工地编号']),
    name: getValue('名称', ['name', '工地名称', '工地名']),
    address: getValue('地址', ['address', '工地地址']),
    manager: getValue('负责人', ['manager', '工地负责人', '负责人姓名']),
    phone: getValue('联系电话', ['phone', '电话', '联系电话', '负责人电话']),
    status: SITE_STATUS_MAP[getValue('状态', ['status', '工地状态']) as keyof typeof SITE_STATUS_MAP] || 'active'
  };
  
  const requiredErrors = validateSiteRequiredFields(siteData);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: siteData, errors };
};

// 转换Excel数据为分判商对象
export const convertExcelToDistributor = (row: any, rowIndex: number, sites: any[] = []): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  // 解析服务工地编号，支持逗号和空格分隔
  const siteCodesText = String(row['服务工地'] || '').trim();
  
  // 使用更精确的分隔符处理
  // 先按逗号分割，再按空格分割，确保不会遗漏
  let siteCodes: string[] = [];
  if (siteCodesText) {
    // 先按逗号分割
    const commaSplit = siteCodesText.split(/[,，]/);
    // 再对每个部分按空格分割
    siteCodes = commaSplit.flatMap(part => 
      part.split(/\s+/).map(code => code.trim()).filter(code => code)
    );
  }
  
  // 根据工地编号查找工地ID
  const siteIds: string[] = [];
  const invalidSiteCodes: string[] = [];
  
  siteCodes.forEach((code: string) => {
    const site = sites.find(s => s.code === code);
    if (site) {
      siteIds.push(site.id);
    } else {
      invalidSiteCodes.push(code);
    }
  });
  
  // 如果有无效的工地编号，添加错误信息
  if (invalidSiteCodes.length > 0) {
    errors.push(`第${rowIndex + 1}行：找不到工地编号 ${invalidSiteCodes.join(', ')}`);
  }
  
  const distributorData = {
    id: String(row['分判商编号'] || '').trim() || (Date.now() + Math.random()).toString(),
    name: String(row['名称'] || '').trim(),
    contactName: String(row['联系人'] || '').trim(),
    phone: String(row['电话'] || '').trim(),
    email: String(row['邮箱'] || '').trim(),
    whatsapp: String(row['WhatsApp'] || '').trim(),
    siteIds: siteIds,
    accountUsername: String(row['账号'] || '').trim(),
    accountStatus: DISTRIBUTOR_STATUS_MAP[row['账号状态'] as keyof typeof DISTRIBUTOR_STATUS_MAP] || 'active'
  };
  
  const requiredErrors = validateDistributorRequiredFields(distributorData);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: distributorData, errors };
};

// 读取工地Excel文件
export const readSiteExcelFile = (file: File): Promise<{ sites: any[]; errors: string[] }> => {
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
          resolve({ sites: [], errors: ['Excel文件至少需要包含标题行和一行数据'] });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        const sites: any[] = [];
        const allErrors: string[] = [];
        
        dataRows.forEach((row: any, index) => {
          if (row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            const rowData: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                rowData[header] = row[colIndex];
              }
            });
            
            const { data, errors } = convertExcelToSite(rowData, index + 1);
            if (errors.length === 0) {
              sites.push(data);
            } else {
              allErrors.push(...errors);
            }
          }
        });
        
        resolve({ sites, errors: allErrors });
      } catch (error) {
        reject(new Error('Excel文件读取失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 读取分判商Excel文件
export const readDistributorExcelFile = (file: File, sites: any[] = []): Promise<{ distributors: any[]; errors: string[] }> => {
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
          resolve({ distributors: [], errors: ['Excel文件至少需要包含标题行和一行数据'] });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        const distributors: any[] = [];
        const allErrors: string[] = [];
        
        dataRows.forEach((row: any, index) => {
          // 检查行是否为空（所有单元格都为空）
          const isEmptyRow = !row.some((cell: any) => cell !== null && cell !== undefined && cell !== '');
          if (isEmptyRow) {
            return; // 跳过空行
          }

          const rowData: any = {};
          headers.forEach((header, colIndex) => {
            if (header && row[colIndex] !== undefined) {
              rowData[header] = row[colIndex];
            }
          });
          
          // 检查是否有必填字段
          const hasName = rowData['名称'] && rowData['名称'].toString().trim() !== '';
          const hasAccount = rowData['账号'] && rowData['账号'].toString().trim() !== '';
          
          if (!hasName || !hasAccount) {
            // 如果缺少必填字段，记录警告信息
            const missingFields = [];
            if (!hasName) missingFields.push('名称');
            if (!hasAccount) missingFields.push('账号');
            allErrors.push(`第${index + 2}行：缺少必填字段（${missingFields.join('、')}），已跳过`);
            return;
          }
          
          const { data, errors } = convertExcelToDistributor(rowData, index + 1, sites);
          if (errors.length === 0) {
            distributors.push(data);
          } else {
            allErrors.push(...errors);
          }
        });
        
        resolve({ distributors, errors: allErrors });
      } catch (error) {
        reject(new Error('Excel文件读取失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 导出工地数据到Excel
export const exportSitesToExcel = (sites: any[], distributors: any[]) => {
  const exportData = sites.map(site => {
    return {
      [SITE_EXCEL_COLUMNS.code]: site.code,
      [SITE_EXCEL_COLUMNS.name]: site.name,
      [SITE_EXCEL_COLUMNS.address]: site.address,
      [SITE_EXCEL_COLUMNS.manager]: site.manager,
      [SITE_EXCEL_COLUMNS.phone]: site.phone,
      [SITE_EXCEL_COLUMNS.status]: site.status === 'active' ? '启用' : site.status === 'suspended' ? '暂停' : '停用'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // 编码
    { wch: 20 }, // 名称
    { wch: 30 }, // 地址
    { wch: 15 }, // 负责人
    { wch: 15 }, // 联系电话
    { wch: 10 }  // 状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '工地信息');
  
  const fileName = `工地信息_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 导出分判商数据到Excel
export const exportDistributorsToExcel = (distributors: any[], sites: any[]) => {
  const exportData = distributors.map(distributor => {
    const siteCodes = distributor.siteIds?.map((siteId: string) => {
      const site = sites.find(s => s.id === siteId);
      return site?.code || siteId;
    }).join(', ') || '';
    
    return {
      [DISTRIBUTOR_EXCEL_COLUMNS.id]: distributor.distributorId || distributor.id,
      [DISTRIBUTOR_EXCEL_COLUMNS.name]: distributor.name,
      [DISTRIBUTOR_EXCEL_COLUMNS.contactName]: distributor.contactName,
      [DISTRIBUTOR_EXCEL_COLUMNS.phone]: distributor.phone,
      [DISTRIBUTOR_EXCEL_COLUMNS.email]: distributor.email,
      [DISTRIBUTOR_EXCEL_COLUMNS.whatsapp]: distributor.whatsapp,
      [DISTRIBUTOR_EXCEL_COLUMNS.siteIds]: siteCodes,
      [DISTRIBUTOR_EXCEL_COLUMNS.accountUsername]: distributor.accountUsername,
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: distributor.accountStatus === 'active' ? '启用' : '禁用'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // 分判商编号
    { wch: 20 }, // 名称
    { wch: 15 }, // 联系人
    { wch: 15 }, // 电话
    { wch: 25 }, // 邮箱
    { wch: 20 }, // 服务工地
    { wch: 15 }, // 账号
    { wch: 10 }  // 账号状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '分判商信息');
  
  const fileName = `分判商信息_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 生成工地导入模板
export const generateSiteImportTemplate = () => {
  const templateData = [
    {
      [SITE_EXCEL_COLUMNS.code]: 'BJ-CBD-001',
      [SITE_EXCEL_COLUMNS.name]: '北京CBD工地',
      [SITE_EXCEL_COLUMNS.address]: '北京市朝阳区建国门外大街1号',
      [SITE_EXCEL_COLUMNS.manager]: '张三',
      [SITE_EXCEL_COLUMNS.phone]: '13800138001',
      [SITE_EXCEL_COLUMNS.status]: '启用'
    },
    {
      [SITE_EXCEL_COLUMNS.code]: 'SH-PD-001',
      [SITE_EXCEL_COLUMNS.name]: '上海浦东工地',
      [SITE_EXCEL_COLUMNS.address]: '上海市浦东新区陆家嘴环路1000号',
      [SITE_EXCEL_COLUMNS.manager]: '李四',
      [SITE_EXCEL_COLUMNS.phone]: '13800138002',
      [SITE_EXCEL_COLUMNS.status]: '启用'
    }
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 }, // 编码
    { wch: 20 }, // 名称
    { wch: 30 }, // 地址
    { wch: 15 }, // 负责人
    { wch: 15 }, // 联系电话
    { wch: 10 }  // 状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '工地信息导入模板');
  
  const fileName = '工地信息导入模板.xlsx';
  XLSX.writeFile(workbook, fileName);
};

// 生成分判商导入模板
export const generateDistributorImportTemplate = () => {
  const templateData = [
    {
      [DISTRIBUTOR_EXCEL_COLUMNS.id]: 'DIST-BJ-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.name]: '北京分判商A',
      [DISTRIBUTOR_EXCEL_COLUMNS.contactName]: '王五',
      [DISTRIBUTOR_EXCEL_COLUMNS.phone]: '13800138003',
      [DISTRIBUTOR_EXCEL_COLUMNS.email]: 'wangwu@example.com',
      [DISTRIBUTOR_EXCEL_COLUMNS.whatsapp]: '+86 13800138003',
      [DISTRIBUTOR_EXCEL_COLUMNS.siteIds]: 'BJ-CBD-001,SH-PD-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountUsername]: 'bj001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: '启用'
    },
    {
      [DISTRIBUTOR_EXCEL_COLUMNS.id]: 'DIST-SH-002',
      [DISTRIBUTOR_EXCEL_COLUMNS.name]: '上海分判商B',
      [DISTRIBUTOR_EXCEL_COLUMNS.contactName]: '赵六',
      [DISTRIBUTOR_EXCEL_COLUMNS.phone]: '13800138004',
      [DISTRIBUTOR_EXCEL_COLUMNS.email]: 'zhaoliu@example.com',
      [DISTRIBUTOR_EXCEL_COLUMNS.whatsapp]: '+86 13800138004',
      [DISTRIBUTOR_EXCEL_COLUMNS.siteIds]: 'SH-PD-001 GZ-TH-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountUsername]: 'sh001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: '启用'
    }
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 }, // 分判商编号
    { wch: 20 }, // 名称
    { wch: 15 }, // 联系人
    { wch: 15 }, // 电话
    { wch: 25 }, // 邮箱
    { wch: 20 }, // WhatsApp
    { wch: 30 }, // 服务工地
    { wch: 15 }, // 账号
    { wch: 12 }  // 账号状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '分判商信息导入模板');
  
  const fileName = '分判商信息导入模板.xlsx';
  XLSX.writeFile(workbook, fileName);
};

// 门卫Excel列映射配置
export const GUARD_EXCEL_COLUMNS = {
  guardId: '门卫编号',
  name: '姓名',
  siteId: '工地编号',
  phone: '联系电话',
  email: '邮箱',
  whatsapp: 'WhatsApp',
  accountUsername: '账号',
  accountStatus: '账号状态'
};

// 门卫账号状态映射
export const GUARD_STATUS_MAP = {
  '启用': 'active',
  '禁用': 'disabled',
  'active': 'active',
  'disabled': 'disabled'
};

// 验证门卫必填字段
export const validateGuardRequiredFields = (data: any): string[] => {
  const errors: string[] = [];
  // 门卫导入必填字段：姓名和联系电话
  const requiredFields = ['name', 'phone'];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${GUARD_EXCEL_COLUMNS[field as keyof typeof GUARD_EXCEL_COLUMNS]}不能为空`);
    }
  });
  
  return errors;
};

// 转换Excel数据为门卫对象
export const convertExcelToGuard = (row: any, rowIndex: number, defaultSiteId?: string): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  const guardData = {
    id: String(row['门卫ID'] || '').trim() || (Date.now() + Math.random()).toString(),
    guardId: String(row['门卫编号'] || '').trim(),
    name: String(row['姓名'] || '').trim(),
    siteId: String(row['工地编号'] || '').trim() || defaultSiteId || '',
    phone: String(row['联系电话'] || '').trim(),
    email: String(row['邮箱'] || '').trim(),
    whatsapp: String(row['WhatsApp'] || '').trim(),
    accountUsername: String(row['账号'] || '').trim(),
    accountStatus: GUARD_STATUS_MAP[row['账号状态'] as keyof typeof GUARD_STATUS_MAP] || 'active'
  };
  
  // 调试信息
  console.log('Excel行数据:', row);
  console.log('转换后的门卫数据:', guardData);
  
  const requiredErrors = validateGuardRequiredFields(guardData);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: guardData, errors };
};

// 读取门卫Excel文件
export const readGuardExcelFile = (file: File, defaultSiteId?: string): Promise<{ guards: any[]; errors: string[] }> => {
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
          resolve({ guards: [], errors: ['Excel文件至少需要包含标题行和一行数据'] });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1);
        
        const guards: any[] = [];
        const allErrors: string[] = [];
        
        dataRows.forEach((row: any, index) => {
          if (row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')) {
            const rowData: any = {};
            headers.forEach((header, colIndex) => {
              if (header && row[colIndex] !== undefined) {
                rowData[header] = row[colIndex];
              }
            });
            
            const { data, errors } = convertExcelToGuard(rowData, index + 1, defaultSiteId);
            if (errors.length === 0) {
              guards.push(data);
            } else {
              allErrors.push(...errors);
            }
          }
        });
        
        resolve({ guards, errors: allErrors });
      } catch (error) {
        reject(new Error('Excel文件读取失败'));
      }
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

// 导出门卫数据到Excel
export const exportGuardsToExcel = (guards: any[], sites: any[]) => {
  const exportData = guards.map(guard => {
    const site = sites.find(s => s.id === guard.siteId);
    
    return {
      [GUARD_EXCEL_COLUMNS.guardId]: guard.guardId || guard.id,
      [GUARD_EXCEL_COLUMNS.name]: guard.name,
      [GUARD_EXCEL_COLUMNS.siteId]: site?.code || guard.siteId,
      [GUARD_EXCEL_COLUMNS.phone]: guard.phone,
      [GUARD_EXCEL_COLUMNS.email]: guard.email,
      [GUARD_EXCEL_COLUMNS.whatsapp]: guard.whatsapp || '',
      [GUARD_EXCEL_COLUMNS.accountUsername]: guard.user?.username || guard.accountUsername || '',
      [GUARD_EXCEL_COLUMNS.accountStatus]: guard.user?.status === 'ACTIVE' ? '启用' : '禁用'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // 门卫编号
    { wch: 15 }, // 姓名
    { wch: 20 }, // 所属工地
    { wch: 15 }, // 联系电话
    { wch: 25 }, // 邮箱
    { wch: 18 }, // WhatsApp
    { wch: 15 }, // 账号
    { wch: 10 }  // 账号状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '门卫信息');
  
  const fileName = `门卫信息_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 生成门卫导入模板
export const generateGuardImportTemplate = () => {
  const templateData = [
    {
      [GUARD_EXCEL_COLUMNS.guardId]: 'G001（可选，不填自动生成）',
      [GUARD_EXCEL_COLUMNS.name]: '张三（必填）',
      [GUARD_EXCEL_COLUMNS.siteId]: 'S12345678（可选，默认关联当前工地）',
      [GUARD_EXCEL_COLUMNS.phone]: '13800138001（必填）',
      [GUARD_EXCEL_COLUMNS.email]: 'zhangsan@example.com（可选）',
      [GUARD_EXCEL_COLUMNS.whatsapp]: '+86 13800138001（可选）',
      [GUARD_EXCEL_COLUMNS.accountUsername]: 'guard001（可选，不填自动生成）',
      [GUARD_EXCEL_COLUMNS.accountStatus]: '启用（可选）'
    },
    {
      [GUARD_EXCEL_COLUMNS.guardId]: '',
      [GUARD_EXCEL_COLUMNS.name]: '李四',
      [GUARD_EXCEL_COLUMNS.siteId]: '',
      [GUARD_EXCEL_COLUMNS.phone]: '13800138002',
      [GUARD_EXCEL_COLUMNS.email]: 'lisi@example.com',
      [GUARD_EXCEL_COLUMNS.whatsapp]: '',
      [GUARD_EXCEL_COLUMNS.accountUsername]: '',
      [GUARD_EXCEL_COLUMNS.accountStatus]: ''
    }
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 }, // 门卫编号
    { wch: 15 }, // 姓名
    { wch: 20 }, // 所属工地
    { wch: 15 }, // 联系电话
    { wch: 25 }, // 邮箱
    { wch: 18 }, // WhatsApp
    { wch: 15 }, // 账号
    { wch: 10 }  // 账号状态
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, '门卫信息导入模板');
  
  const fileName = '门卫信息导入模板.xlsx';
  XLSX.writeFile(workbook, fileName);
};