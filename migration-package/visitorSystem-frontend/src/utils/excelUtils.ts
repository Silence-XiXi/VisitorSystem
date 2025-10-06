import * as XLSX from 'xlsx';
import { Worker, CreateWorkerRequest } from '../types/worker';

// Excel列映射配置 - 支持多语言
export const getExcelColumns = (t: (key: string) => string) => ({
  workerId: t('worker.workerId'),
  name: t('worker.name'),
  gender: t('worker.gender'),
  idType: t('worker.idType'),
  idNumber: t('worker.idNumber'),
  birthDate: t('worker.birthDate'),
  region: t('worker.region'),
  distributorId: t('admin.distributorId'),
  siteId: t('admin.siteId'),
  phone: t('worker.phone'),
  email: t('worker.email'),
  whatsapp: t('worker.whatsapp'),
  status: t('worker.status')
});

// 英语列名配置 - 用于验证错误信息
export const ENGLISH_EXCEL_COLUMNS = {
  workerId: 'Worker ID',
  name: 'Name',
  gender: 'Gender',
  idType: 'ID Type',
  idNumber: 'ID Number',
  birthDate: 'Birth Date',
  region: 'Region',
  distributorId: 'Distributor ID',
  siteId: 'Site ID',
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  status: 'Status'
};

// 兼容性：保留原有的硬编码配置（用于向后兼容）
export const EXCEL_COLUMNS = {
  workerId: '工人编号',
  name: '姓名',
  gender: '性别',
  idType: '证件类型',
  idNumber: '证件号码',
  birthDate: '出生日期',
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
  'female': 'female',
  'Male': 'male',
  'Female': 'female'
};

// 状态映射
export const STATUS_MAP = {
  '启用': 'active',
  '停用': 'inactive',
  'active': 'active',
  'inactive': 'inactive',
  'Active': 'active',
  'Inactive': 'inactive'
};

// 证件类型映射
export const ID_TYPE_MAP = {
  '身份证': 'ID_CARD',
  '护照': 'PASSPORT',
  '驾驶证': 'DRIVER_LICENSE',
  '其他': 'OTHER',
  'ID_CARD': 'ID_CARD',
  'PASSPORT': 'PASSPORT',
  'DRIVER_LICENSE': 'DRIVER_LICENSE',
  'OTHER': 'OTHER',
  'ID Card': 'ID_CARD',
  'Passport': 'PASSPORT',
  'Driver License': 'DRIVER_LICENSE',
  'Other': 'OTHER'
};

// 地区映射 - 支持多语言和英语
export const getRegionMap = (t?: (key: string) => string) => {
  if (!t) {
    // 默认简体中文映射
    return {
      '中国大陆': '中国大陆',
      '中国香港': '中国香港',
      '中国澳门': '中国澳门',
      '中国台湾': '中国台湾',
      '其他': '其他',
      // 英语地区名称
      'Mainland China': '中国大陆',
      'Hong Kong': '中国香港',
      'Macau': '中国澳门',
      'Taiwan': '中国台湾',
      'Other': '其他'
    };
  }
  
  // 多语言映射
  return {
    [t('regions.mainland')]: t('regions.mainland'),
    [t('regions.hongkong')]: t('regions.hongkong'),
    [t('regions.macau')]: t('regions.macau'),
    [t('regions.taiwan')]: t('regions.taiwan'),
    [t('regions.other')]: t('regions.other'),
    // 英语地区名称映射到当前语言
    'Mainland China': t('regions.mainland'),
    'Hong Kong': t('regions.hongkong'),
    'Macau': t('regions.macau'),
    'Taiwan': t('regions.taiwan'),
    'Other': t('regions.other')
  };
};

// 验证必填字段
export const validateRequiredFields = (data: any, t?: (key: string) => string): string[] => {
  const errors: string[] = [];
  const requiredMessage = t ? t('form.required') : '不能为空';
  
  // 必填字段列表
  const requiredFields = [
    { key: 'name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'phone', label: 'Phone' }
  ];
  
  // 调试信息：显示所有字段的值
  console.log('验证必填字段 - 数据:', data);
  
  requiredFields.forEach(field => {
    const value = data[field.key];
    const isEmpty = !value || value.toString().trim() === '';
    console.log(`${field.label}: "${value}" (${typeof value}) - ${isEmpty ? '空值' : '有值'}`);
    
    if (isEmpty) {
      errors.push(`${field.label}${requiredMessage}`);
    }
  });
  
  return errors;
};

// 验证数据格式 - 已取消所有正则匹配和验证
export const validateDataFormat = (): string[] => {
  // 不再进行任何格式验证，只返回空错误数组
  return [];
};

// 检查证件号码是否重复
export const checkIdNumberDuplicate = (idNumber: string, existingWorkers: any[]): boolean => {
  if (!idNumber || idNumber.trim() === '') return false;
  return existingWorkers.some(worker => worker.idNumber === idNumber.trim());
};

// 转换Excel数据为工人对象
export const convertExcelToWorker = (row: any, rowIndex: number, t?: (key: string) => string, existingWorkers: any[] = []): { data: CreateWorkerRequest | null; errors: string[] } => {
  const errors: string[] = [];
  
  // 调试信息
  console.log(`第${rowIndex + 1}行原始数据:`, row);
  console.log(`第${rowIndex + 1}行映射后的数据:`, {
    workerId: String(row['Worker ID'] || row['工人编号'] || row.workerId || '').trim(),
    name: String(row['Name'] || row['姓名'] || row.name || '').trim(),
    gender: row['Gender'] || row['性别'] || row.gender,
    idType: row['ID Type'] || row['证件类型'] || row.idType || 'ID_CARD',
    idNumber: String(row['ID Number'] || row['证件号码'] || row.idNumber || row['ID Card'] || row['身份证号'] || row.idCard || '').trim(),
    birthDate: String(row['Birth Date'] || row['出生日期'] || row.birthDate || '').trim(),
    region: row['Region'] || row['地区'] || row.region,
    distributorId: String(row['Distributor ID'] || row['分判商ID'] || row.distributorId || '').trim(),
    siteId: String(row['Site ID'] || row['工地ID'] || row.siteId || '').trim(),
    phone: String(row['Phone'] || row['联系电话'] || row.phone || '').trim(),
    email: String(row['Email'] || row['邮箱'] || row.email || '').trim(),
    whatsapp: String(row['WhatsApp'] || row.whatsapp || '').trim(),
    status: row['Status'] || row['状态'] || row.status
  });
  
  // 获取原始值用于验证
  const rawGender = row['Gender'] || row['性别'] || row.gender;
  const rawStatus = row['Status'] || row['状态'] || row.status;
  const rawRegion = row['Region'] || row['地区'] || row.region;
  
  // 已取消性别、状态和地区的格式验证
  
  // 数据清洗和转换
  const workerData = {
    workerId: String(row['Worker ID'] || row['工人编号'] || row.workerId || '').trim(),
    name: String(row['Name'] || row['姓名'] || row.name || '').trim(),
    gender: GENDER_MAP[String(rawGender || '').trim()] || String(rawGender || '').trim(),
    idType: ID_TYPE_MAP[row['ID Type'] || row['证件类型'] || row.idType || 'ID_CARD'] || 'ID_CARD',
    idNumber: String(row['ID Number'] || row['证件号码'] || row.idNumber || row['ID Card'] || row['身份证号'] || row.idCard || '').trim(),
    birthDate: String(row['Birth Date'] || row['出生日期'] || row.birthDate || '').trim(),
    region: String(rawRegion || '').trim(),
    distributorId: String(row['Distributor ID'] || row['分判商ID'] || row.distributorId || '').trim(),
    siteId: String(row['Site ID'] || row['工地ID'] || row.siteId || '').trim(),
    phone: String(row['Phone'] || row['联系电话'] || row.phone || '').trim(),
    email: String(row['Email'] || row['邮箱'] || row.email || '').trim(),
    whatsapp: String(row['WhatsApp'] || row.whatsapp || '').trim(),
    status: STATUS_MAP[String(rawStatus || '').trim()] || String(rawStatus || '').trim()
  };
  
  // 验证必填字段
  const requiredErrors = validateRequiredFields(workerData, t);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 验证数据格式 - 已取消所有格式验证
  const formatErrors = validateDataFormat();
  errors.push(...formatErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 检查身份证是否重复 - 直接跳过，不添加错误信息
  if (workerData.idNumber && checkIdNumberDuplicate(workerData.idNumber, existingWorkers)) {
    // 身份证重复时直接跳过，不添加错误信息
    return { data: null, errors: [] };
  }
  
  return { data: workerData, errors };
};

// 转换Excel数据为工人对象（分判商专用，支持中文列名）
export const convertExcelToWorkerForDistributor = (row: any, rowIndex: number, t?: (key: string) => string, existingWorkers: any[] = []): { data: CreateWorkerRequest | null; errors: string[] } => {
  const errors: string[] = [];
  
  // 获取原始值用于验证
  const rawGender = row['性别'] || row['Gender'] || row.gender;
  const rawStatus = row['状态'] || row['Status'] || row.status;
  const rawRegion = row['地区'] || row['Region'] || row.region;
  
  // 已取消性别、状态和地区的格式验证
  
  // 将中文列名映射为英文字段名，同时支持英文列名
  const workerData = {
    workerId: String(row['工人编号'] || row['Worker ID'] || row.workerId || '').trim(),
    name: String(row['姓名'] || row['Name'] || row.name || '').trim(),
    gender: GENDER_MAP[String(rawGender || '').trim()] || String(rawGender || '').trim(),
    idType: ID_TYPE_MAP[row['证件类型'] || row['ID Type'] || row.idType || 'ID_CARD'] || 'ID_CARD',
    idNumber: String(row['证件号码'] || row['ID Number'] || row.idNumber || row['身份证号'] || row['ID Card'] || row.idCard || '').trim(),
    birthDate: String(row['出生日期'] || row['Birth Date'] || row.birthDate || '').trim(),
    region: String(rawRegion || '').trim(),
    // 注意：分销商导入时不使用 distributorId 和 siteId，这些字段由后端自动设置
    phone: String(row['联系电话'] || row['Phone'] || row.phone || '').trim(),
    email: String(row['邮箱'] || row['Email'] || row.email || '').trim(),
    whatsapp: String(row['WhatsApp'] || row.whatsapp || '').trim(),
    status: STATUS_MAP[String(rawStatus || '').trim()] || String(rawStatus || '').trim()
  };
  
  // 验证必填字段
  const requiredFields = [
    { key: 'name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'phone', label: 'Phone' }
  ];
  
  // 调试信息：显示所有字段的值
  console.log(`第${rowIndex + 1}行验证必填字段 - 数据:`, workerData);
  
  const requiredMessage = t ? t('form.required') : '不能为空';
  requiredFields.forEach(field => {
    const value = workerData[field.key];
    const isEmpty = !value || value.toString().trim() === '';
    console.log(`第${rowIndex + 1}行 ${field.label}: "${value}" (${typeof value}) - ${isEmpty ? '空值' : '有值'}`);
    
    if (isEmpty) {
      errors.push(`${field.label}${requiredMessage}`);
    }
  });
  
  // 验证数据格式 - 已取消所有格式验证
  const formatErrors = validateDataFormat();
  errors.push(...formatErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 检查身份证是否重复 - 直接跳过，不添加错误信息
  if (workerData.idNumber && checkIdNumberDuplicate(workerData.idNumber, existingWorkers)) {
    // 身份证重复时直接跳过，不添加错误信息
    return { data: null, errors: [] };
  }
  
  return { data: workerData, errors };
};

// 转换Excel数据为工人对象（管理员专用，支持分判商和工地名称映射）
export const convertExcelToWorkerForAdmin = (row: any, rowIndex: number, distributors: any[], sites: any[], t?: (key: string) => string, existingWorkers: any[] = []): { data: CreateWorkerRequest | null; errors: string[] } => {
  const errors: string[] = [];
  
  // 获取原始值用于验证
  const rawGender = row['性别'] || row['Gender'] || row.gender;
  const rawStatus = row['状态'] || row['Status'] || row.status;
  const rawRegion = row['地区'] || row['Region'] || row.region;
  
  // 已取消性别、状态和地区的格式验证
  
  // 将中文列名映射为英文字段名，同时支持英文列名
  const workerData = {
    workerId: String(row['工人编号'] || row['Worker ID'] || row.workerId || '').trim(),
    name: String(row['姓名'] || row['Name'] || row.name || '').trim(),
    gender: GENDER_MAP[String(rawGender || '').trim()] || String(rawGender || '').trim(),
    idType: ID_TYPE_MAP[row['证件类型'] || row['ID Type'] || row.idType || 'ID_CARD'] || 'ID_CARD',
    idNumber: String(row['证件号码'] || row['ID Number'] || row.idNumber || row['身份证号'] || row['ID Card'] || row.idCard || '').trim(),
    birthDate: String(row['出生日期'] || row['Birth Date'] || row.birthDate || '').trim(),
    region: String(rawRegion || '').trim(),
    distributorId: String(row['分判商ID'] || row['Distributor ID'] || row.distributorId || '').trim(),
    siteId: String(row['工地ID'] || row['Site ID'] || row.siteId || '').trim(),
    phone: String(row['联系电话'] || row['Phone'] || row.phone || '').trim(),
    email: String(row['邮箱'] || row['Email'] || row.email || '').trim(),
    whatsapp: String(row['WhatsApp'] || row.whatsapp || '').trim(),
    status: STATUS_MAP[String(rawStatus || '').trim()] || String(rawStatus || '').trim()
  };
  
  // 处理分判商名称映射
  const distributorName = String(row['分判商'] || row['Distributor'] || row.distributor || '').trim();
  if (distributorName) {
    const distributor = distributors.find(d => d.name === distributorName);
    if (distributor) {
      workerData.distributorId = distributor.id;
    } else {
      errors.push(`第${rowIndex + 1}行：找不到分判商"${distributorName}"`);
    }
  }
  
  // 处理工地名称映射
  const siteName = String(row['所属工地'] || row['Site'] || row.site || '').trim();
  if (siteName) {
    const site = sites.find(s => s.name === siteName);
    if (site) {
      workerData.siteId = site.id;
    } else {
      errors.push(`第${rowIndex + 1}行：找不到工地"${siteName}"`);
    }
  }
  
  // 验证必填字段
  const requiredFields = [
    { key: 'name', label: 'Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'idNumber', label: 'ID Number' },
    { key: 'phone', label: 'Phone' }
  ];
  
  // 调试信息：显示所有字段的值
  console.log(`第${rowIndex + 1}行验证必填字段 - 数据:`, workerData);
  
  const requiredMessage = t ? t('form.required') : '不能为空';
  requiredFields.forEach(field => {
    const value = workerData[field.key];
    const isEmpty = !value || value.toString().trim() === '';
    console.log(`第${rowIndex + 1}行 ${field.label}: "${value}" (${typeof value}) - ${isEmpty ? '空值' : '有值'}`);
    
    if (isEmpty) {
      errors.push(`${field.label}${requiredMessage}`);
    }
  });
  
  // 验证数据格式 - 已取消所有格式验证
  const formatErrors = validateDataFormat();
  errors.push(...formatErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 检查身份证是否重复 - 直接跳过，不添加错误信息
  if (workerData.idNumber && checkIdNumberDuplicate(workerData.idNumber, existingWorkers)) {
    // 身份证重复时直接跳过，不添加错误信息
    return { data: null, errors: [] };
  }
  
  return { data: workerData, errors };
};

// 读取Excel文件
export const readExcelFile = (file: File, t?: (key: string) => string, existingWorkers: any[] = []): Promise<{ workers: CreateWorkerRequest[]; errors: string[] }> => {
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
        
        // 调试信息
        console.log('Excel标题行:', headers);
        console.log('数据行数:', dataRows.length);
        console.log('前几行数据:', dataRows.slice(0, 3));
        
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
            
            const { data, errors } = convertExcelToWorker(rowData, index + 1, t, existingWorkers);
            if (data && errors.length === 0) {
              workers.push(data);
            } else if (errors.length > 0) {
              allErrors.push(...errors);
            }
            // 如果 data 为 null（身份证重复），则静默跳过，不添加错误
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
  // 始终使用英文表头，与模板保持一致
  const columns = ENGLISH_EXCEL_COLUMNS;
  
  
  // 准备导出数据
  const exportData = workers.map((worker) => {
    // 优先使用当前登录用户的分判商信息（如果提供了）
    const currentDistributor = distributors.length > 0 ? distributors[0] : null;
    
    // 查找分判商信息：优先使用worker.distributor，然后从distributors数组中查找
    let distributor = worker.distributor;
    if (!distributor && distributors.length > 0) {
      // 如果worker.distributor不存在，从distributors数组中查找
      distributor = distributors.find((d: any) => d.id === worker.distributorId);
    }
    // 如果还是找不到，使用当前登录用户的分判商信息
    if (!distributor) {
      distributor = currentDistributor;
    }
    
    // 查找工地信息：优先使用worker.site，然后从sites数组中查找
    let site = worker.site;
    if (!site && sites.length > 0) {
      // 如果worker.site不存在，从sites数组中查找
      site = sites.find((s: any) => s.id === worker.siteId);
    }
    
    
    return {
      [columns.workerId]: worker.workerId,
      [columns.name]: worker.name,
      [columns.gender]: worker.gender === 'MALE' ? 'Male' : 'Female',
      [columns.idType]: worker.idType,
      [columns.idNumber]: worker.idNumber,
      [columns.birthDate]: worker.birthDate ? new Date(worker.birthDate).toISOString().split('T')[0] : '',
      [columns.region]: worker.region || '',
      [columns.distributorId]: distributor?.distributorId || '',
      [columns.siteId]: site?.code || '',
      [columns.phone]: worker.phone,
      [columns.email]: worker.email || '',
      [columns.whatsapp]: worker.whatsapp || '',
      [columns.status]: (worker.status === 'ACTIVE' || (worker.status as any) === 'active') ? 'Active' : 'Inactive'
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
    { wch: 12 }, // 出生日期
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

// 生成导入模板 - 统一使用英语表头
export const generateImportTemplate = () => {
  // 统一使用英语列名
  const columns = {
    workerId: 'Worker ID',
    name: 'Name',
    gender: 'Gender',
    idType: 'ID Type',
    idNumber: 'ID Number',
    birthDate: 'Birth Date',
    region: 'Region',
    distributorId: 'Distributor ID',
    siteId: 'Site ID',
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    status: 'Status'
  };
  
  // 模板数据
  const templateData = [
    {
      [columns.workerId]: 'WK001（可选，不填自动生成）',
      [columns.name]: 'John Doe',
      [columns.gender]: 'Male',
      [columns.idType]: 'ID Card',
      [columns.idNumber]: '110101199001011234',
      [columns.birthDate]: '1990-01-01',
      [columns.region]: 'Mainland China',
      [columns.distributorId]: 'DIST001',
      [columns.siteId]: 'SITE001',
      [columns.phone]: '13800138001',
      [columns.email]: 'john@example.com',
      [columns.whatsapp]: '+86 13800138001',
      [columns.status]: 'Active'
    },
    {
      [columns.workerId]: '',
      [columns.name]: 'Jane Smith',
      [columns.gender]: 'Female',
      [columns.idType]: 'ID Card',
      [columns.idNumber]: '310101199002021234',
      [columns.birthDate]: '1990-02-02',
      [columns.region]: 'Hong Kong',
      [columns.distributorId]: 'DIST002',
      [columns.siteId]: 'SITE002',
      [columns.phone]: '13800138002',
      [columns.email]: 'jane@example.com',
      [columns.whatsapp]: '+852 13800138002',
      [columns.status]: 'Active'
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
    { wch: 12 }, // 出生日期
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
  const sheetName = 'Worker Import Template';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // 生成文件名
  const fileName = 'Worker_Import_Template.xlsx';
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};

// 生成工人导入模板（分判商专用）- 统一使用英语表头
export const generateWorkerImportTemplate = () => {
  // 统一使用英语列名
  const columns = {
    workerId: 'Worker ID',
    name: 'Name',
    gender: 'Gender',
    idType: 'ID Type',
    idNumber: 'ID Number',
    birthDate: 'Birth Date',
    region: 'Region',
    distributorId: 'Distributor ID',
    siteId: 'Site ID',
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    status: 'Status'
  };
  
  // 模板数据
  const templateData = [
    {
      [columns.workerId]: 'WK001（可选，不填自动生成）',
      [columns.name]: 'John Doe',
      [columns.gender]: 'Male',
      [columns.idType]: 'ID Card',
      [columns.idNumber]: '110101199001011234',
      [columns.birthDate]: '1990-01-01',
      [columns.region]: 'Mainland China',
      [columns.distributorId]: 'DIST001',
      [columns.siteId]: 'SITE001',
      [columns.phone]: '13800138001',
      [columns.email]: 'john@example.com',
      [columns.whatsapp]: '+86 13800138001',
      [columns.status]: 'Active'
    },
    {
      [columns.workerId]: '',
      [columns.name]: 'Jane Smith',
      [columns.gender]: 'Female',
      [columns.idType]: 'ID Card',
      [columns.idNumber]: '310101199002021234',
      [columns.birthDate]: '1990-02-02',
      [columns.region]: 'Mainland China',
      [columns.distributorId]: 'DIST001',
      [columns.siteId]: 'SITE001',
      [columns.phone]: '13800138002',
      [columns.email]: 'jane@example.com',
      [columns.whatsapp]: '+86 13800138002',
      [columns.status]: 'Active'
    }
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  const colWidths = [
    { wch: 15 }, // 工人编号
    { wch: 12 }, // 姓名
    { wch: 8 },  // 性别
    { wch: 20 }, // 身份证号
    { wch: 12 }, // 出生日期
    { wch: 12 }, // 地区
    { wch: 15 }, // 分判商ID
    { wch: 15 }, // 工地ID
    { wch: 15 }, // 联系电话
    { wch: 25 }, // 邮箱
    { wch: 18 }, // WhatsApp
    { wch: 8 }   // 状态
  ];

  worksheet['!cols'] = colWidths;

  const sheetName = 'Worker Import Template';
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileName = 'Worker_Import_Template.xlsx';
  
  // 下载文件
  XLSX.writeFile(workbook, fileName);
};

// 读取工人Excel文件（分判商专用）
export const readWorkerExcelFile = (file: File, distributors?: any[], sites?: any[], t?: (key: string) => string, existingWorkers: any[] = []): Promise<{ workers: CreateWorkerRequest[]; errors: string[] }> => {
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
        jsonData.slice(1).forEach((row: unknown, index: number) => {
          const rowArray = row as unknown[];
          if (rowArray.every(cell => cell === undefined || cell === '')) {
            return; // 跳过空行
          }
          
          const rowData: any = {};
          headers.forEach((header, colIndex) => {
            if (header && rowArray[colIndex] !== undefined) {
              rowData[header] = rowArray[colIndex];
            }
          });
          
          // 根据是否有distributors和sites参数选择转换函数
          const { data, errors } = distributors && sites 
            ? convertExcelToWorkerForAdmin(rowData, index + 1, distributors, sites, t, existingWorkers)
            : convertExcelToWorkerForDistributor(rowData, index + 1, t, existingWorkers);
          if (data && errors.length === 0) {
            workers.push(data);
          } else if (errors.length > 0) {
            allErrors.push(...errors);
          }
          // 如果 data 为 null（身份证重复），则静默跳过，不添加错误
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
  code: 'Code',
  name: 'Name',
  address: 'Address',
  manager: 'Manager',
  phone: 'Phone',
  status: 'Status'
};

// 保留中文配置用于兼容性和显示
export const SITE_EXCEL_COLUMNS_ZH = {
  code: '编码',
  name: '名称',
  address: '地址',
  manager: '负责人',
  phone: '联系电话',
  status: '状态'
};

// 分判商Excel列映射配置 - 英文表头
export const DISTRIBUTOR_EXCEL_COLUMNS = {
  id: 'Distributor ID',
  name: 'Name',
  contactName: 'Contact Person',
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  siteIds: 'Site Codes',
  accountUsername: 'Account Username',
  accountStatus: 'Account Status'
};

// 保留中文配置用于兼容性和显示
export const DISTRIBUTOR_EXCEL_COLUMNS_ZH = {
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
export const validateSiteRequiredFields = (data: any, t?: (key: string) => string): string[] => {
  const errors: string[] = [];
  const requiredFields = ['name', 'address'];
  const requiredMessage = t ? t('form.required') : '不能为空';
  
  // 使用英语列名
  const englishColumns = {
    name: 'Name',
    address: 'Address'
  };
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${englishColumns[field as keyof typeof englishColumns]}${requiredMessage}`);
    }
  });
  
  return errors;
};

// 验证分判商必填字段
export const validateDistributorRequiredFields = (data: any, t?: (key: string) => string): string[] => {
  const errors: string[] = [];
  const requiredFields = ['name', 'accountUsername'];
  const requiredMessage = t ? t('form.required') : '不能为空';
  
  // 使用英语列名
  const englishColumns = {
    name: 'Name',
    accountUsername: 'Account Username'
  };
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${englishColumns[field as keyof typeof englishColumns]}${requiredMessage}`);
    }
  });
  
  return errors;
};

// 转换Excel数据为工地对象 - 支持中英文表头
export const convertExcelToSite = (row: any, rowIndex: number, t?: (key: string) => string): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  // 尝试不同的列名映射 - 优先英文，再中文
  const getValue = (key: string, fallbackKeys: string[] = []) => {
    // 首先尝试英文表头
    const englishFields: Record<string, string[]> = {
      'code': ['Code', 'code', 'CODE', 'Site Code', 'site code', 'SITE_CODE'],
      'name': ['Name', 'name', 'NAME', 'Site Name', 'site name'],
      'address': ['Address', 'address', 'ADDRESS', 'Site Address', 'site address'],
      'manager': ['Manager', 'manager', 'MANAGER', 'Site Manager', 'site manager'],
      'phone': ['Phone', 'phone', 'PHONE', 'Contact Phone', 'contact phone', 'Telephone'],
      'status': ['Status', 'status', 'STATUS', 'Site Status', 'site status']
    };
    
    // 尝试从英文表头映射
    if (englishFields[key]) {
      for (const englishKey of englishFields[key]) {
        if (row[englishKey] !== undefined && row[englishKey] !== null && row[englishKey] !== '') {
          return String(row[englishKey]).trim();
        }
      }
    }
    
    // 后备方案 - 尝试中文表头和原始key
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return String(row[key]).trim();
    }
    
    // 中文表头映射
    const chineseFields: Record<string, string[]> = {
      'code': ['编码', '编号', '工地编号'],
      'name': ['名称', '工地名称', '工地名'],
      'address': ['地址', '工地地址'],
      'manager': ['负责人', '工地负责人', '负责人姓名'],
      'phone': ['联系电话', '电话', '负责人电话'],
      'status': ['状态', '工地状态']
    };
    
    // 尝试中文表头
    if (chineseFields[key]) {
      for (const chineseKey of chineseFields[key]) {
        if (row[chineseKey] !== undefined && row[chineseKey] !== null && row[chineseKey] !== '') {
          return String(row[chineseKey]).trim();
        }
      }
    }
    
    // 尝试用户提供的其他可能的key
    for (const fallbackKey of fallbackKeys) {
      if (row[fallbackKey] !== undefined && row[fallbackKey] !== null && row[fallbackKey] !== '') {
        return String(row[fallbackKey]).trim();
      }
    }
    
    return '';
  };
  
  // 从Excel行数据中提取工地信息
  const siteData = {
    code: getValue('code', ['编码', 'Code']),
    name: getValue('name', ['名称', 'Name']),
    address: getValue('address', ['地址', 'Address']),
    manager: getValue('manager', ['负责人', 'Manager']),
    phone: getValue('phone', ['联系电话', 'Phone']),
    status: SITE_STATUS_MAP[getValue('status', ['状态', 'Status']) as keyof typeof SITE_STATUS_MAP] || 'active'
  };
  
  const requiredErrors = validateSiteRequiredFields(siteData, t);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: siteData, errors };
};

// 转换Excel数据为分判商对象 - 支持中英文表头
export const convertExcelToDistributor = (row: any, rowIndex: number, sites: any[] = [], t?: (key: string) => string): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  // 获取字段值的辅助函数 - 支持多语言
  const getValue = (fieldKey: string, options: string[]): string => {
    for (const option of options) {
      if (row[option] !== undefined && row[option] !== null && row[option] !== '') {
        return String(row[option]).trim();
      }
    }
    return '';
  };
  
  // 解析服务工地编号，支持逗号、顿号和空格分隔
  const siteCodesText = getValue('siteIds', [
    'Site Codes', 'Sites', 'Site IDs', 'site codes', 
    '服务工地', '工地编号', '工地', 'siteIds', 'siteId'
  ]);
  
  // 输出工地编号原始文本信息用于调试
  console.log(`第${rowIndex + 1}行工地编号原始文本: "${siteCodesText}"`);
  
  // 使用更精确的分隔符处理
  // 先按逗号、顿号分割，再按空格分割，确保不会遗漏
  let siteCodes: string[] = [];
  if (siteCodesText) {
    // 先按逗号、顿号分割 (增加顿号「、」的支持)
    const commaSplit = siteCodesText.split(/[,，、]/);
    // 再对每个部分按空格分割
    siteCodes = commaSplit.flatMap(part => 
      part.split(/\s+/).map(code => code.trim()).filter(code => code)
    );
    
    // 输出解析后的工地编号列表
    console.log(`第${rowIndex + 1}行解析后的工地编号: [${siteCodes.join(', ')}]`);
  }
  
  // 根据工地编号查找工地ID
  const siteIds: string[] = [];
  const invalidSiteCodes: string[] = [];
  const matchedSites: {code: string, name: string}[] = [];
  
  // 输出可用的工地总数信息
  console.log(`系统中可用的工地总数: ${sites.length}`);
  if (sites.length > 0) {
    console.log(`工地示例: ${sites[0].code} - ${sites[0].name}`);
  }
  
  siteCodes.forEach((code: string) => {
    const site = sites.find(s => s.code === code);
    if (site) {
      siteIds.push(site.id);
      matchedSites.push({code: site.code, name: site.name});
    } else {
      invalidSiteCodes.push(code);
    }
  });
  
  // 输出匹配到的工地信息
  console.log(`第${rowIndex + 1}行匹配到${matchedSites.length}个工地:`, 
    matchedSites.map(s => `${s.code} - ${s.name}`).join(', '));
  
  // 如果有无效的工地编号，添加错误信息
  if (invalidSiteCodes.length > 0) {
    console.log(`第${rowIndex + 1}行发现${invalidSiteCodes.length}个无效工地编号:`, invalidSiteCodes.join(', '));
    errors.push(`第${rowIndex + 1}行：找不到工地编号 ${invalidSiteCodes.join(', ')}`);
  }
  
  // 使用辅助函数获取各字段值
  const distributorData = {
    id: getValue('id', [
      'Distributor ID', 'ID', 'id', 'distributor_id',
      '分判商编号', '编号', 'ID'
    ]) || (Date.now() + Math.random()).toString(),
    
    name: getValue('name', [
      'Name', 'name', 'DistributorName', 'distributor_name', 'Company Name',
      '名称', '分判商名称', '公司名称', '名称(公司)', '公司'
    ]),
    
    contactName: getValue('contactName', [
      'Contact Person', 'Contact Name', 'Contact', 'contact',
      '联系人', '联系人姓名', '负责人'
    ]),
    
    phone: getValue('phone', [
      'Phone', 'Contact Phone', 'Phone Number', 'phone',
      '电话', '联系电话', '电话号码', '手机号码', '手机'
    ]),
    
    email: getValue('email', [
      'Email', 'Contact Email', 'E-mail', 'email',
      '邮箱', '电子邮箱', '邮件', '电邮'
    ]),
    
    whatsapp: getValue('whatsapp', [
      'WhatsApp', 'Whatsapp', 'WhatsApp Number', 'whatsapp',
      'WhatsApp号码', '微信'
    ]),
    
    siteIds: siteIds,
    
    accountUsername: getValue('accountUsername', [
      'Account Username', 'Username', 'Login', 'Account', 'login', 'Account Name',
      '账号', '用户名', '登录名', '账户名称', '登录账号', '账户'
    ]),
    
    accountStatus: DISTRIBUTOR_STATUS_MAP[
      getValue('accountStatus', [
        'Account Status', 'Status', 'state', 'status',
        '账号状态', '状态', '账户状态'
      ]) as keyof typeof DISTRIBUTOR_STATUS_MAP
    ] || 'active'
  };
  
  const requiredErrors = validateDistributorRequiredFields(distributorData, t);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  // 输出最终解析结果
  console.log(`第${rowIndex + 1}行分判商最终数据:`, {
    name: distributorData.name,
    accountUsername: distributorData.accountUsername,
    siteIds: distributorData.siteIds,
    siteCount: distributorData.siteIds.length
  });
  
  return { data: distributorData, errors };
};

// 读取工地Excel文件
export const readSiteExcelFile = (file: File, t?: (key: string) => string): Promise<{ sites: any[]; errors: string[] }> => {
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
            
            const { data, errors } = convertExcelToSite(rowData, index + 1, t);
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
export const readDistributorExcelFile = (file: File, sites: any[] = [], t?: (key: string) => string): Promise<{ distributors: any[]; errors: string[] }> => {
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
        
        // 输出表头信息用于调试
        console.log('分判商Excel文件表头：', headers);
        
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
          
          // 调试信息：显示每一行的数据内容
          console.log(`第${index + 2}行数据:`, rowData);
          
          // 检查是否有必填字段 - 支持多种可能的列名
          const nameValues = ['名称', '分判商名称', '公司名称', '名称(公司)', '公司', 'Name', 'DistributorName', 'Company Name'];
          const accountValues = ['账号', '用户名', '登录名', '账户名称', '登录账号', '账户', 'Account Username', 'Username', 'Login', 'Account', 'Account Name'];
          
          // 调试信息：显示检测到的列名
          const nameMatch = nameValues.find(key => rowData[key] !== undefined);
          const accountMatch = accountValues.find(key => rowData[key] !== undefined);
          console.log(`第${index + 2}行检测：名称列=${nameMatch || '未找到'}(值=${nameMatch ? rowData[nameMatch] : '无'}), 账号列=${accountMatch || '未找到'}(值=${accountMatch ? rowData[accountMatch] : '无'})`)
          
          // 检查任意一个名称字段是否有值
          const hasName = nameValues.some(key => rowData[key] && rowData[key].toString().trim() !== '');
          // 检查任意一个账号字段是否有值
          const hasAccount = accountValues.some(key => rowData[key] && rowData[key].toString().trim() !== '');
          
          if (!hasName || !hasAccount) {
            // 如果缺少必填字段，记录警告信息
            const missingFields = [];
            if (!hasName) missingFields.push('名称');
            if (!hasAccount) missingFields.push('账号');
            allErrors.push(`第${index + 2}行：缺少必填字段（${missingFields.join('、')}），已跳过`);
            console.log(`跳过第${index + 2}行，缺少必填字段：`, rowData);
            return;
          }
          
          const { data, errors } = convertExcelToDistributor(rowData, index + 1, sites, t);
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

// 导出工地数据到Excel - 使用英文表头
export const exportSitesToExcel = (sites: any[]) => {
  const exportData = sites.map(site => {
    return {
      [SITE_EXCEL_COLUMNS.code]: site.code,
      [SITE_EXCEL_COLUMNS.name]: site.name,
      [SITE_EXCEL_COLUMNS.address]: site.address,
      [SITE_EXCEL_COLUMNS.manager]: site.manager,
      [SITE_EXCEL_COLUMNS.phone]: site.phone,
      [SITE_EXCEL_COLUMNS.status]: site.status === 'active' ? 'active' : site.status === 'suspended' ? 'suspended' : 'inactive'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // Code
    { wch: 20 }, // Name
    { wch: 30 }, // Address
    { wch: 15 }, // Manager
    { wch: 15 }, // Phone
    { wch: 10 }  // Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Information');
  
  const fileName = `Sites_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 导出分判商数据到Excel - 使用英文表头
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
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: distributor.accountStatus === 'active' ? 'active' : 'disabled'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // Distributor ID
    { wch: 20 }, // Name
    { wch: 15 }, // Contact Person
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 20 }, // Site Codes
    { wch: 15 }, // Account Username
    { wch: 10 }  // Account Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Distributor Information');
  
  const fileName = `Distributors_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 生成工地导入模板 - 使用英文表头
export const generateSiteImportTemplate = () => {
  // 使用英文表头
  const templateData = [
    {
      [SITE_EXCEL_COLUMNS.code]: 'BJ-CBD-001',
      [SITE_EXCEL_COLUMNS.name]: 'Beijing CBD Site',
      [SITE_EXCEL_COLUMNS.address]: 'No.1 Jianguomenwai Street, Chaoyang District, Beijing',
      [SITE_EXCEL_COLUMNS.manager]: 'Zhang San',
      [SITE_EXCEL_COLUMNS.phone]: '13800138001',
      [SITE_EXCEL_COLUMNS.status]: 'active'
    },
    {
      [SITE_EXCEL_COLUMNS.code]: 'SH-PD-001',
      [SITE_EXCEL_COLUMNS.name]: 'Shanghai Pudong Site',
      [SITE_EXCEL_COLUMNS.address]: 'No.1000 Lujiazui Ring Road, Pudong New District, Shanghai',
      [SITE_EXCEL_COLUMNS.manager]: 'Li Si',
      [SITE_EXCEL_COLUMNS.phone]: '13800138002',
      [SITE_EXCEL_COLUMNS.status]: 'active'
    }
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 }, // Code
    { wch: 20 }, // Name
    { wch: 30 }, // Address
    { wch: 15 }, // Manager
    { wch: 15 }, // Phone
    { wch: 10 }  // Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Import Template');
  
  const fileName = 'Site_Import_Template.xlsx';
  XLSX.writeFile(workbook, fileName);
};

// 生成分判商导入模板 - 使用英文表头
export const generateDistributorImportTemplate = () => {
  const templateData = [
    {
      [DISTRIBUTOR_EXCEL_COLUMNS.id]: 'DIST-BJ-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.name]: 'Beijing Distributor A',
      [DISTRIBUTOR_EXCEL_COLUMNS.contactName]: 'Wang Wu',
      [DISTRIBUTOR_EXCEL_COLUMNS.phone]: '13800138003',
      [DISTRIBUTOR_EXCEL_COLUMNS.email]: 'wangwu@example.com',
      [DISTRIBUTOR_EXCEL_COLUMNS.whatsapp]: '+86 13800138003',
      [DISTRIBUTOR_EXCEL_COLUMNS.siteIds]: 'BJ-CBD-001,SH-PD-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountUsername]: 'bj001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: 'active'
    },
    {
      [DISTRIBUTOR_EXCEL_COLUMNS.id]: 'DIST-SH-002',
      [DISTRIBUTOR_EXCEL_COLUMNS.name]: 'Shanghai Distributor B',
      [DISTRIBUTOR_EXCEL_COLUMNS.contactName]: 'Zhao Liu',
      [DISTRIBUTOR_EXCEL_COLUMNS.phone]: '13800138004',
      [DISTRIBUTOR_EXCEL_COLUMNS.email]: 'zhaoliu@example.com',
      [DISTRIBUTOR_EXCEL_COLUMNS.whatsapp]: '+86 13800138004',
      [DISTRIBUTOR_EXCEL_COLUMNS.siteIds]: 'SH-PD-001 GZ-TH-001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountUsername]: 'sh001',
      [DISTRIBUTOR_EXCEL_COLUMNS.accountStatus]: 'active'
    }
  ];
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  
  const colWidths = [
    { wch: 15 }, // Distributor ID
    { wch: 20 }, // Name
    { wch: 15 }, // Contact Person
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 20 }, // WhatsApp
    { wch: 30 }, // Site Codes
    { wch: 15 }, // Account Username
    { wch: 12 }  // Account Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Distributor Import Template');
  
  const fileName = 'Distributor_Import_Template.xlsx';
  XLSX.writeFile(workbook, fileName);
};

// 门卫Excel列映射配置 - 英文表头
export const GUARD_EXCEL_COLUMNS = {
  guardId: 'Guard ID',
  name: 'Name',
  siteId: 'Site Code',
  phone: 'Phone',
  email: 'Email',
  whatsapp: 'WhatsApp',
  accountUsername: 'Account Username',
  accountStatus: 'Account Status'
};

// 保留中文配置用于兼容性和显示
export const GUARD_EXCEL_COLUMNS_ZH = {
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
export const validateGuardRequiredFields = (data: any, t?: (key: string) => string): string[] => {
  const errors: string[] = [];
  // 门卫导入必填字段：姓名和联系电话
  const requiredFields = ['name', 'phone'];
  const requiredMessage = t ? t('form.required') : '不能为空';
  
  // 使用英语列名
  const englishColumns = {
    name: 'Name',
    phone: 'Phone'
  };
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${englishColumns[field as keyof typeof englishColumns]}${requiredMessage}`);
    }
  });
  
  return errors;
};

// 转换Excel数据为门卫对象 - 支持中英文表头
export const convertExcelToGuard = (row: any, rowIndex: number, defaultSiteId?: string, t?: (key: string) => string): { data: any; errors: string[] } => {
  const errors: string[] = [];
  
  // 获取字段值的辅助函数 - 支持多语言
  const getValue = (fieldKey: string, options: string[]): string => {
    for (const option of options) {
      if (row[option] !== undefined && row[option] !== null && row[option] !== '') {
        return String(row[option]).trim();
      }
    }
    return '';
  };
  
  const guardData = {
    id: getValue('id', [
      'Guard ID', 'ID', 'id', 'guard_id',
      '门卫ID', '门卫编码', 'ID'
    ]) || (Date.now() + Math.random()).toString(),
    
    guardId: getValue('guardId', [
      'Guard ID', 'Guard Number', 'GuardId', 'guard_id',
      '门卫编号', '编号', '工号'
    ]),
    
    name: getValue('name', [
      'Name', 'Guard Name', 'name',
      '姓名', '门卫姓名', '名字'
    ]),
    
    siteId: getValue('siteId', [
      'Site Code', 'Site ID', 'siteId', 'site_id',
      '工地编号', '所属工地', '工地'
    ]) || defaultSiteId || '',
    
    phone: getValue('phone', [
      'Phone', 'Contact Phone', 'Phone Number', 'phone',
      '联系电话', '电话', '电话号码', '手机号码', '手机'
    ]),
    
    email: getValue('email', [
      'Email', 'Contact Email', 'E-mail', 'email',
      '邮箱', '电子邮箱', '邮件', '电邮'
    ]),
    
    whatsapp: getValue('whatsapp', [
      'WhatsApp', 'Whatsapp', 'WhatsApp Number', 'whatsapp',
      'WhatsApp号码', '微信'
    ]),
    
    accountUsername: getValue('accountUsername', [
      'Account Username', 'Username', 'Login', 'Account', 'login',
      '账号', '用户名', '登录名', '账户名称'
    ]),
    
    accountStatus: GUARD_STATUS_MAP[
      getValue('accountStatus', [
        'Account Status', 'Status', 'state', 'status',
        '账号状态', '状态', '账户状态'
      ]) as keyof typeof GUARD_STATUS_MAP
    ] || 'active'
  };
  
  // 调试信息
  console.log('Excel行数据:', row);
  console.log('转换后的门卫数据:', guardData);
  
  const requiredErrors = validateGuardRequiredFields(guardData, t);
  errors.push(...requiredErrors.map(error => `第${rowIndex + 1}行：${error}`));
  
  return { data: guardData, errors };
};

// 读取门卫Excel文件
export const readGuardExcelFile = (file: File, defaultSiteId?: string, t?: (key: string) => string): Promise<{ guards: any[]; errors: string[] }> => {
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
            
            const { data, errors } = convertExcelToGuard(rowData, index + 1, defaultSiteId, t);
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

// 导出门卫数据到Excel - 使用英文表头
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
      [GUARD_EXCEL_COLUMNS.accountStatus]: guard.user?.status === 'ACTIVE' ? 'active' : 'disabled'
    };
  });
  
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  const colWidths = [
    { wch: 15 }, // Guard ID
    { wch: 15 }, // Name
    { wch: 20 }, // Site Code
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 18 }, // WhatsApp
    { wch: 15 }, // Account Username
    { wch: 10 }  // Account Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guard Information');
  
  const fileName = `Guards_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// 生成门卫导入模板 - 使用英文表头
export const generateGuardImportTemplate = () => {
  const templateData = [
    {
      [GUARD_EXCEL_COLUMNS.guardId]: 'G001 (Optional, auto-generated if empty)',
      [GUARD_EXCEL_COLUMNS.name]: 'Zhang San (Required)',
      [GUARD_EXCEL_COLUMNS.siteId]: 'S12345678 (Optional, default to current site)',
      [GUARD_EXCEL_COLUMNS.phone]: '13800138001 (Required)',
      [GUARD_EXCEL_COLUMNS.email]: 'zhangsan@example.com (Optional)',
      [GUARD_EXCEL_COLUMNS.whatsapp]: '+86 13800138001 (Optional)',
      [GUARD_EXCEL_COLUMNS.accountUsername]: 'guard001 (Optional, auto-generated if empty)',
      [GUARD_EXCEL_COLUMNS.accountStatus]: 'active (Optional)'
    },
    {
      [GUARD_EXCEL_COLUMNS.guardId]: '',
      [GUARD_EXCEL_COLUMNS.name]: 'Li Si',
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
    { wch: 15 }, // Guard ID
    { wch: 15 }, // Name
    { wch: 20 }, // Site Code
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 18 }, // WhatsApp
    { wch: 15 }, // Account Username
    { wch: 10 }  // Account Status
  ];
  worksheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guard Import Template');
  
  const fileName = 'Guard_Import_Template.xlsx';
  XLSX.writeFile(workbook, fileName);
};