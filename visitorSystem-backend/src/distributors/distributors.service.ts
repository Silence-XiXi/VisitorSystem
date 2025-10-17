import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as XLSX from 'xlsx';

@Injectable()
export class DistributorsService {
  constructor(private prisma: PrismaService) {}

  // 获取当前分销商信息
  async getCurrentDistributor(user: CurrentUser) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以访问此接口');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id },
      include: {
        sites: {
          include: {
            site: true
          }
        },
        workers: {
          include: {
            site: true
          }
        }
      }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    return distributor;
  }

  // 更新分销商资料
  async updateDistributorProfile(user: CurrentUser, updateData: any) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以更新资料');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    // 更新分销商信息
    const updatedDistributor = await this.prisma.distributor.update({
      where: { id: distributor.id },
      data: {
        name: updateData.name,
        contactName: updateData.contactName,
        phone: updateData.phone,
        email: updateData.email,
        whatsapp: updateData.whatsapp
      },
      include: {
        sites: {
          include: {
            site: true
          }
        }
      }
    });

    return updatedDistributor;
  }

  // 获取分销商管理的工地列表
  async getDistributorSites(user: CurrentUser) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以访问此接口');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id },
      include: {
        sites: {
          include: {
            site: true
          }
        }
      }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    return distributor.sites.map(sd => sd.site);
  }

  // 获取分销商管理的工人列表
  async getDistributorWorkers(user: CurrentUser, siteId?: string) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以访问此接口');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    const whereClause: any = {
      distributorId: distributor.id
    };

    if (siteId) {
      whereClause.siteId = siteId;
    }

    const workers = await this.prisma.worker.findMany({
      where: whereClause,
      include: {
        distributor: true,
        site: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return workers;
  }

  // 生成工人编号
  private async generateWorkerId(): Promise<string> {
    // 生成8位随机数字
    const generateRandomDigits = () => {
      return Math.floor(10000000 + Math.random() * 90000000).toString();
    };
    
    let workerId: string;
    let exists: boolean;

    do {
      // 生成8位纯数字编号
      workerId = generateRandomDigits();
      
      // 检查是否已存在
      const existingWorker = await this.prisma.worker.findUnique({
        where: { workerId }
      });
      exists = !!existingWorker;
    } while (exists);
    
    return workerId;
  }

  // 创建工人
  async createWorker(user: CurrentUser, workerData: any) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以创建工人');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    // 验证工地是否属于该分销商
    const siteDistributor = await this.prisma.siteDistributor.findFirst({
      where: {
        siteId: workerData.siteId,
        distributorId: distributor.id
      }
    });

    if (!siteDistributor) {
      throw new ForbiddenException('您没有权限在此工地创建工人');
    }

    // 生成工人编号（如果未提供）
    let workerId = workerData.workerId;
    if (!workerId || workerId.trim() === '') {
      workerId = await this.generateWorkerId();
    } else {
      // 检查提供的工人编号是否已存在
      const existingWorker = await this.prisma.worker.findUnique({
        where: { workerId: workerId.trim() }
      });
      if (existingWorker) {
        throw new ConflictException('工人编号已存在');
      }
    }

    try {
      return await this.prisma.worker.create({
        data: {
          ...workerData,
          workerId: workerId.trim(),
          distributorId: distributor.id
        },
        include: {
          site: true
        }
      });
    } catch (error: any) {
      console.log('创建工人时的错误:', error);
      console.log('错误代码:', error?.code);
      console.log('错误元数据:', error?.meta);
      console.log('错误消息:', error?.message);
      
      // 检查是否是Prisma唯一约束冲突错误
      if (error?.code === 'P2002') {
        console.log('检测到唯一约束冲突');
        const target = error?.meta?.target;
        console.log('冲突字段:', target);
        
        if (Array.isArray(target)) {
          if (target.includes('idCard')) {
            console.log('身份证号冲突');
            throw new ConflictException('身份证号已存在');
          } else if (target.includes('workerId')) {
            console.log('工人编号冲突');
            throw new ConflictException('工人编号已存在');
          } else if (target.includes('phone')) {
            console.log('手机号冲突');
            throw new ConflictException('手机号码已存在');
          }
        } else if (typeof target === 'string') {
          if (target.includes('idCard')) {
            console.log('身份证号冲突');
            throw new ConflictException('身份证号已存在');
          } else if (target.includes('workerId')) {
            console.log('工人编号冲突');
            throw new ConflictException('工人编号已存在');
          } else if (target.includes('phone')) {
            console.log('手机号冲突');
            throw new ConflictException('手机号码已存在');
          }
        }
        
        console.log('其他唯一约束冲突:', target);
        throw new ConflictException('数据已存在，请检查输入信息');
      }
      
      // 检查错误消息中是否包含重复信息
      const errorMessage = error?.message || '';
      if (errorMessage.includes('Unique constraint') || errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        if (errorMessage.includes('idNumber') || errorMessage.includes('证件号码') || errorMessage.includes('idCard') || errorMessage.includes('身份证')) {
          throw new ConflictException('证件号码已存在');
        } else if (errorMessage.includes('workerId') || errorMessage.includes('工号')) {
          throw new ConflictException('工人编号已存在');
        } else if (errorMessage.includes('phone') || errorMessage.includes('手机')) {
          throw new ConflictException('手机号码已存在');
        }
        throw new ConflictException('数据已存在，请检查输入信息');
      }
      
      console.log('非唯一约束错误，重新抛出');
      throw error;
    }
  }

  // 更新工人信息
  async updateWorker(user: CurrentUser, workerId: string, updateData: any) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以更新工人信息');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    const worker = await this.prisma.worker.findFirst({
      where: {
        id: workerId,
        distributorId: distributor.id
      }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在或您没有权限修改此工人');
    }

    // 处理可选字段，确保空字符串转换为null，但只处理实际传递的字段
    const processedData = {
      ...updateData,
      // 只处理实际传递的字段，避免清空未传递的字段
      ...(updateData.email !== undefined && { email: updateData.email || null }),
      ...(updateData.whatsapp !== undefined && { whatsapp: updateData.whatsapp || null }),
      ...(updateData.birthDate !== undefined && { birthDate: updateData.birthDate ? new Date(updateData.birthDate) : null })
    };

    return this.prisma.worker.update({
      where: { id: workerId },
      data: processedData,
      include: {
        site: true
      }
    });
  }

  // 删除工人
  async deleteWorker(user: CurrentUser, workerId: string) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以删除工人');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    const worker = await this.prisma.worker.findFirst({
      where: {
        id: workerId,
        distributorId: distributor.id
      }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在或您没有权限删除此工人');
    }

    return this.prisma.worker.delete({
      where: { id: workerId }
    });
  }

  // 获取分销商统计数据
  async getDistributorStats(user: CurrentUser) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以访问统计数据');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    const [totalWorkers, activeWorkers, totalSites] = await Promise.all([
      this.prisma.worker.count({
        where: { distributorId: distributor.id }
      }),
      this.prisma.worker.count({
        where: { 
          distributorId: distributor.id,
          status: 'ACTIVE'
        }
      }),
      this.prisma.siteDistributor.count({
        where: { distributorId: distributor.id }
      })
    ]);

    return {
      totalWorkers,
      activeWorkers,
      inactiveWorkers: totalWorkers - activeWorkers,
      totalSites
    };
  }

  // 批量导入工人数据
  async importWorkers(user: CurrentUser, workersData: any[]) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以导入工人数据');
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { userId: user.id },
      include: {
        sites: {
          include: {
            site: true
          }
        }
      }
    });

    if (!distributor) {
      throw new NotFoundException('分销商信息不存在');
    }

    // 获取分销商可用的工地ID列表
    const availableSiteIds = distributor.sites.map(sd => sd.siteId);

    const results = {
      success: 0,
      skipped: 0, // 重复的记录
      errors: 0,
      errorDetails: [] as string[]
    };

    // 如果没有数据，直接返回空结果
    if (!workersData || workersData.length === 0) {
      return results;
    }

    for (let i = 0; i < workersData.length; i++) {
      const workerData = workersData[i];
      
      try {
        console.log(`处理第${i + 1}行数据:`, workerData);
        
        // 检查必填字段
        if (!workerData.name || !workerData.gender || !workerData.idNumber || !workerData.phone) {
          const missingFields = [];
          if (!workerData.name) missingFields.push('姓名');
          if (!workerData.gender) missingFields.push('性别');
          if (!workerData.idNumber) missingFields.push('证件号码');
          if (!workerData.phone) missingFields.push('手机号');
          
          results.errors++;
          results.errorDetails.push(`第${i + 1}行：缺少必填字段 [${missingFields.join(', ')}]`);
          console.log(`第${i + 1}行缺少必填字段:`, missingFields);
          continue;
        }

        // 检查证件号码是否已存在
        const existingWorker = await this.prisma.worker.findUnique({
          where: { idNumber: workerData.idNumber }
        });

        if (existingWorker) {
          results.skipped++;
          console.log(`第${i + 1}行证件号码重复:`, workerData.idNumber);
          continue;
        }

        // 生成工人编号
        const workerId = await this.generateWorkerId();
        
        // 验证并处理工地ID
        let targetSiteId = workerData.siteId;
        if (targetSiteId && !availableSiteIds.includes(targetSiteId)) {
          // 如果指定的工地ID不属于当前分销商，使用第一个可用工地
          targetSiteId = availableSiteIds.length > 0 ? availableSiteIds[0] : null;
        } else if (!targetSiteId) {
          // 如果没有指定工地ID，使用第一个可用工地
          targetSiteId = availableSiteIds.length > 0 ? availableSiteIds[0] : null;
        }

        if (!targetSiteId) {
          throw new Error('没有可用的工地，请联系管理员');
        }
        
        // 处理可选字段，确保空字符串转换为null
        const processedData = {
          name: workerData.name,
          phone: workerData.phone,
          idType: workerData.idType || 'ID_CARD',
          idNumber: workerData.idNumber || workerData.idCard, // 兼容旧字段名
          gender: this.normalizeGender(workerData.gender),
          region: workerData.region || null,
          workerId: workerId.trim(),
          email: workerData.email || null,
          whatsapp: workerData.whatsapp || null,
          birthDate: workerData.birthDate ? new Date(workerData.birthDate) : null,
          distributorId: distributor.id, // 始终使用当前分销商ID
          siteId: targetSiteId, // 使用验证后的工地ID
          status: (workerData.status?.toUpperCase() || 'ACTIVE') as 'ACTIVE' | 'INACTIVE'
        };

        await this.prisma.worker.create({
          data: processedData
        });

        results.success++;
      } catch (error) {
        results.errors++;
        results.errorDetails.push(`第${i + 1}行：${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return results;
  }

  // 地区名称到区号的映射表
  private getAreaCodeFromRegion(regionInput: string): string {
    if (!regionInput || typeof regionInput !== 'string') {
      return '+86'; // 默认返回中国大陆区号
    }
    
    // 清理输入：去除前后空格
    const cleanInput = regionInput.trim();
    const lowerInput = cleanInput.toLowerCase();
    
    // 地区到区号的映射表
    const regionMap = {
      // 中国大陆相关
      '+86': [
        '中国大陆', 'Mainland China', 'China', '中国', 'CN', 'PRC', 'People\'s Republic of China',
        '中國大陸', '中國', 'PRC', 'People\'s Republic of China'
      ],
      // 香港相关
      '+852': [
        '中国香港', 'Hong Kong', '香港', 'HK', 'HKG',
        '中國香港', '香港', 'HK', 'HKG'
      ],
      // 澳门相关
      '+853': [
        '中国澳门', 'Macau', 'Macao', '澳门', 'MO', 'MAC',
        '中國澳門', '澳門', 'MO', 'MAC'
      ],
      // 台湾相关
      '+886': [
        '中国台湾', 'Taiwan', '台湾', 'TW', 'TWN', 'Republic of China', 'ROC',
        '中國台灣', '台灣', 'TW', 'TWN', 'Republic of China', 'ROC'
      ],
      // 新加坡
      '+65': [
        'Singapore', '新加坡', 'SG', 'SGP',
        '新加坡', 'SG', 'SGP'
      ],
      // 马来西亚
      '+60': [
        'Malaysia', '马来西亚', 'MY', 'MYS',
        '馬來西亞', 'MY', 'MYS'
      ],
      // 泰国
      '+66': [
        'Thailand', '泰国', 'TH', 'THA',
        '泰國', 'TH', 'THA'
      ],
      // 菲律宾
      '+63': [
        'Philippines', '菲律宾', 'PH', 'PHL',
        '菲律賓', 'PH', 'PHL'
      ],
      // 印度尼西亚
      '+62': [
        'Indonesia', '印度尼西亚', 'ID', 'IDN',
        '印度尼西亞', 'ID', 'IDN'
      ],
      // 越南
      '+84': [
        'Vietnam', '越南', 'VN', 'VNM',
        '越南', 'VN', 'VNM'
      ],
      // 美国/加拿大
      '+1': [
        'United States', 'USA', 'US', 'America', '美国', 'Canada', '加拿大', 'CA', 'CAN',
        '美國', '加拿大', 'CA', 'CAN'
      ],
      // 英国
      '+44': [
        'United Kingdom', 'UK', 'Britain', '英国', 'GB', 'GBR',
        '英國', 'GB', 'GBR'
      ],
      // 德国
      '+49': [
        'Germany', '德国', 'DE', 'DEU',
        '德國', 'DE', 'DEU'
      ],
      // 法国
      '+33': [
        'France', '法国', 'FR', 'FRA',
        '法國', 'FR', 'FRA'
      ],
      // 日本
      '+81': [
        'Japan', '日本', 'JP', 'JPN',
        '日本', 'JP', 'JPN'
      ],
      // 韩国
      '+82': [
        'South Korea', 'Korea', '韩国', 'KR', 'KOR',
        '韓國', 'KR', 'KOR'
      ],
      // 印度
      '+91': [
        'India', '印度', 'IN', 'IND',
        '印度', 'IN', 'IND'
      ],
      // 澳大利亚
      '+61': [
        'Australia', '澳大利亚', 'AU', 'AUS',
        '澳大利亞', 'AU', 'AUS'
      ]
    };
    
    // 遍历所有区号和对应的地区名称列表
    for (const [areaCode, regionNames] of Object.entries(regionMap)) {
      for (const regionName of regionNames) {
        // 直接匹配
        if (cleanInput === regionName) {
          return areaCode;
        }
        
        // 小写匹配
        if (lowerInput === regionName.toLowerCase()) {
          return areaCode;
        }
        
        // 模糊匹配 - 检查是否包含关键词
        if (lowerInput.includes(regionName.toLowerCase()) || regionName.toLowerCase().includes(lowerInput)) {
          return areaCode;
        }
      }
    }
    
    // 特殊处理一些常见的情况
    if (lowerInput.includes('china') || lowerInput.includes('mainland') || lowerInput.includes('中國')) {
      return '+86';
    }
    if (lowerInput.includes('hong') && lowerInput.includes('kong')) {
      return '+852';
    }
    if (lowerInput.includes('macau') || lowerInput.includes('macao') || lowerInput.includes('澳門')) {
      return '+853';
    }
    if (lowerInput.includes('taiwan') || lowerInput.includes('台灣')) {
      return '+886';
    }
    
    // 如果都匹配不到，返回默认值
    return '+86';
  }

  // 通过Excel文件导入工人数据
  async importWorkersFromExcel(user: CurrentUser, file: Express.Multer.File) {
    if (user.role !== 'DISTRIBUTOR') {
      throw new ForbiddenException('只有分销商可以导入工人数据');
    }

    if (!file) {
      throw new NotFoundException('未找到上传的文件');
    }

    try {
      console.log('开始处理Excel文件:', file.originalname, '大小:', file.size);
      
      // 读取Excel文件
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // console.log('Excel解析结果:', jsonData.length, '行数据');
      // console.log('第一行数据示例:', jsonData[0]);

      // 转换Excel数据为工人数据格式
      const workersData = jsonData.map((row: any, index: number) => {
        // 获取所有可能的字段名
        const fieldNames = Object.keys(row);
        // console.log(`第${index + 1}行字段:`, fieldNames);
        
        // 辅助函数：处理空值，将 "-" 转换为 null
        const getValue = (value: any) => {
          if (!value || value === '-' || value.toString().trim() === '' || value.toString().trim() === '-') {
            return null;
          }
          return value.toString().trim();
        };

        // 获取原始地区名称并转换为区号
        const rawRegion = getValue(row['地区'] || row['region'] || row['Region']);
        const areaCode = this.getAreaCodeFromRegion(rawRegion);
        
        // 调试信息：显示地区识别过程
        if (rawRegion) {
          console.log(`第${index + 1}行地区识别：输入"${rawRegion}" -> 识别为区号"${areaCode}"`);
        }

        return {
          name: getValue(row['姓名'] || row['name'] || row['Name']) || '',
          gender: this.normalizeGender(getValue(row['性别'] || row['gender'] || row['Gender']) || ''),
          idNumber: getValue(row['证件号码'] || row['idNumber'] || row['ID Number'] || row['身份证号'] || row['idCard'] || row['ID Card'] || row['身份证']) || '',
          phone: getValue(row['手机号'] || row['phone'] || row['Phone'] || row['手机']) || '',
          email: getValue(row['邮箱'] || row['email'] || row['Email']),
          whatsapp: getValue(row['WhatsApp'] || row['whatsapp']),
          birthDate: getValue(row['出生日期'] || row['birthDate'] || row['Birth Date']),
          region: areaCode, // 保存识别出的区号
          siteId: getValue(row['工地ID'] || row['siteId'] || row['Site ID']),
          status: this.normalizeWorkerStatus(getValue(row['状态'] || row['status'] || row['Status']) || ''),
          workerId: getValue(row['工人编号'] || row['workerId'] || row['Worker ID'])
        };
      });

      // console.log('转换后的工人数据示例:', workersData[0]);

      // 调用现有的导入方法
      return await this.importWorkers(user, workersData);

    } catch (error) {
      console.error('Excel文件处理失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      throw new Error(`Excel文件格式错误或处理失败: ${error.message}`);
    }
  }

  // 标准化性别字段
  private normalizeGender(gender: string): 'MALE' | 'FEMALE' {
    if (!gender) return 'MALE'; // 默认值
    
    const normalized = gender.toString().toLowerCase().trim();
    
    if (normalized === 'male' || normalized === 'm' || normalized === '男' || normalized === '1') {
      return 'MALE';
    }
    
    if (normalized === 'female' || normalized === 'f' || normalized === '女' || normalized === '2') {
      return 'FEMALE';
    }
    
    // 如果无法识别，默认为 MALE
    return 'MALE';
  }

  // 标准化工人状态字段
  private normalizeWorkerStatus(status: string): 'ACTIVE' | 'INACTIVE' {
    if (!status) return 'ACTIVE'; // 默认值
    
    const normalized = status.toString().toLowerCase().trim();
    
    if (normalized === 'active' || normalized === '启用' || normalized === '正常' || normalized === '1') {
      return 'ACTIVE';
    }
    
    if (normalized === 'inactive' || normalized === '禁用' || normalized === '停用' || normalized === '0') {
      return 'INACTIVE';
    }
    
    // 如果无法识别，默认为 ACTIVE
    return 'ACTIVE';
  }
}
