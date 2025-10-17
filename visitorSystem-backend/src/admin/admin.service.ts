import { Injectable, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 获取系统统计数据
  async getSystemStats(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问系统统计');
    }

    const [
      totalUsers,
      totalDistributors,
      totalSites,
      totalGuards,
      totalWorkers,
      activeWorkers,
      totalItems,
      borrowedItems
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.distributor.count(),
      this.prisma.site.count(),
      this.prisma.guard.count(),
      this.prisma.worker.count(),
      this.prisma.worker.count({ where: { status: 'ACTIVE' } }),
      this.prisma.item.count(),
      this.prisma.itemBorrowRecord.count({ where: { status: 'BORROWED' } })
    ]);

    return {
      totalUsers,
      totalDistributors,
      totalSites,
      totalGuards,
      totalWorkers,
      activeWorkers,
      inactiveWorkers: totalWorkers - activeWorkers,
      totalItems,
      borrowedItems,
      availableItems: totalItems - borrowedItems
    };
  }

  // 获取所有分销商列表
  async getAllDistributors(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问所有分销商');
    }

    const distributors = await this.prisma.distributor.findMany({
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true
          }
        },
        sites: {
          include: {
            site: true
          }
        },
        workers: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 转换数据格式以匹配前端期望
    return distributors.map(distributor => ({
      ...distributor,
      siteIds: distributor.sites.map(sd => sd.siteId)
    }));
  }

  // 获取所有工地列表
  async getAllSites(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问所有工地');
    }

    return this.prisma.site.findMany({
      include: {
        distributors: {
          include: {
            distributor: true
          }
        },
        guards: true,
        workers: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // 获取门卫列表
  async getAllGuards(user: CurrentUser, siteId?: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问门卫列表');
    }

    const whereClause = siteId ? { siteId } : {};

    return this.prisma.guard.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true
          }
        },
        site: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // 获取所有工人列表
  async getAllWorkers(user: CurrentUser, filters?: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问所有工人');
    }

    const whereClause: any = {};

    if (filters?.distributorId) {
      whereClause.distributorId = filters.distributorId;
    }

    if (filters?.siteId) {
      whereClause.siteId = filters.siteId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    return this.prisma.worker.findMany({
      where: whereClause,
      include: {
        distributor: true,
        site: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
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
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建工人');
    }

    // 验证分判商是否存在（通过主键ID）
    let actualDistributorId = null;
    if (workerData.distributorId) {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: workerData.distributorId }
      });
      if (!distributor) {
        throw new NotFoundException('分判商不存在');
      }
      actualDistributorId = distributor.id; // 使用主键ID
    }

    // 验证工地是否存在（通过主键ID）
    let actualSiteId = null;
    if (workerData.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: workerData.siteId }
      });
      if (!site) {
        throw new NotFoundException('工地不存在');
      }
      actualSiteId = site.id; // 使用主键ID
    }

    // 检查证件号码是否已存在
    if (workerData.idNumber) {
      const existingWorker = await this.prisma.worker.findUnique({
        where: { idNumber: workerData.idNumber }
      });
      if (existingWorker) {
        throw new ConflictException('证件号码已存在');
      }
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

    // 处理可选字段，使用实际的主键ID
    const processedData = {
      ...workerData,
      workerId: workerId.trim(),
      email: workerData.email || null,
      whatsapp: workerData.whatsapp || null,
      birthDate: workerData.birthDate ? new Date(workerData.birthDate) : null,
      // 使用实际的主键ID
      distributorId: actualDistributorId,
      siteId: actualSiteId
    };

    try {
      return await this.prisma.worker.create({
        data: processedData,
        include: {
          distributor: true,
          site: true
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('idNumber')) {
          throw new ConflictException('证件号码已存在');
        } else if (error.meta?.target?.includes('workerId')) {
          throw new ConflictException('工人编号已存在');
        }
      }
      throw error;
    }
  }

  // 更新工人信息
  async updateWorker(user: CurrentUser, workerId: string, updateData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以更新工人信息');
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在');
    }

    // 验证分判商是否存在
    if (updateData.distributorId) {
      const distributor = await this.prisma.distributor.findUnique({
        where: { id: updateData.distributorId }
      });
      if (!distributor) {
        throw new NotFoundException('分判商不存在');
      }
    }

    // 验证工地是否存在
    if (updateData.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: updateData.siteId }
      });
      if (!site) {
        throw new NotFoundException('工地不存在');
      }
    }

    // 处理可选字段，确保空字符串转换为null
    const processedData = {
      ...updateData,
      email: updateData.email || null,
      whatsapp: updateData.whatsapp || null,
      birthDate: updateData.birthDate ? new Date(updateData.birthDate) : null
    };

    return this.prisma.worker.update({
      where: { id: workerId },
      data: processedData,
      include: {
        distributor: true,
        site: true
      }
    });
  }

  // 删除工人
  async deleteWorker(user: CurrentUser, workerId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除工人');
    }

    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在');
    }

    return this.prisma.worker.delete({
      where: { id: workerId }
    });
  }

  // 创建分销商
  async createDistributor(user: CurrentUser, distributorData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建分销商');
    }

    console.log('创建分判商数据:', JSON.stringify(distributorData, null, 2));

    // 数据验证
    if (!distributorData.name || !distributorData.name.trim()) {
      throw new BadRequestException('分判商名称不能为空');
    }

    if (!distributorData.username || !distributorData.username.trim()) {
      throw new BadRequestException('用户名不能为空');
    }

    if (!distributorData.password || distributorData.password.length < 6) {
      throw new BadRequestException('密码长度不能少于6位');
    }

    // 验证服务工地不能为空
    if (!distributorData.siteIds || !Array.isArray(distributorData.siteIds) || distributorData.siteIds.length === 0) {
      throw new BadRequestException('服务工地不能为空，请至少选择一个工地');
    }

    // 自动生成分判商编号
    const distributorId = await this.generateDistributorId();

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: distributorData.username }
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const { siteIds = [], ...distributorInfo } = distributorData;
    
    // 确保siteIds是数组
    const validSiteIds = Array.isArray(siteIds) ? siteIds : [];

    // 验证工地ID是否有效
    if (validSiteIds.length > 0) {
      const existingSites = await this.prisma.site.findMany({
        where: { id: { in: validSiteIds } }
      });
      
      if (existingSites.length !== validSiteIds.length) {
        throw new BadRequestException('部分工地ID无效');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(distributorData.password, 10);

    // 创建用户
    const newUser = await this.prisma.user.create({
      data: {
        username: distributorData.username,
        password: hashedPassword,
        role: 'DISTRIBUTOR',
        status: 'ACTIVE'
      }
    });

    // 创建分销商
    const newDistributor = await this.prisma.distributor.create({
      data: {
        distributorId: distributorId,
        name: distributorData.name,
        contactName: distributorData.contactName,
        phone: distributorData.phone,
        email: distributorData.email,
        whatsapp: distributorData.whatsapp,
        userId: newUser.id
      },
      include: {
        user: {
          select: {
            username: true,
            status: true
          }
        }
      }
    });

    // 如果有关联的工地，创建关联关系
    if (validSiteIds && validSiteIds.length > 0) {
      try {
        console.log('创建工地关联关系:', validSiteIds);
        
        const siteDistributorData = validSiteIds.map((siteId: string) => ({
          siteId,
          distributorId: newDistributor.id
        }));

        await this.prisma.siteDistributor.createMany({
          data: siteDistributorData
        });

        console.log('工地关联关系创建成功');

        // 重新查询以包含关联的工地
        const distributorWithSites = await this.prisma.distributor.findUnique({
          where: { id: newDistributor.id },
          include: {
            user: {
              select: {
                username: true,
                status: true
              }
            },
            sites: {
              include: {
                site: true
              }
            }
          }
        });

        // 转换数据格式以匹配前端期望
        return {
          ...distributorWithSites,
          siteIds: distributorWithSites.sites.map(sd => sd.siteId)
        };
      } catch (error) {
        console.error('创建工地关联关系失败:', error);
        // 即使关联关系创建失败，也返回分判商数据
        return newDistributor;
      }
    }

    return newDistributor;
  }

  // 更新分判商
  async updateDistributor(user: CurrentUser, distributorId: string, distributorData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以更新分判商');
    }

    // 检查分判商是否存在
    const existingDistributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { user: true }
    });

    if (!existingDistributor) {
      throw new BadRequestException('分判商不存在');
    }

    const { siteIds = [], username, ...updateData } = distributorData;
    
    // 确保siteIds是数组
    const validSiteIds = Array.isArray(siteIds) ? siteIds : [];

    // 验证工地ID是否有效
    if (validSiteIds.length > 0) {
      const existingSites = await this.prisma.site.findMany({
        where: { id: { in: validSiteIds } }
      });
      
      if (existingSites.length !== validSiteIds.length) {
        throw new BadRequestException('部分工地ID无效');
      }
    }

    // 如果提供了新用户名，检查是否已存在
    if (username && username !== existingDistributor.user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: username }
      });
      
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }
    }

    // 更新分判商基本信息和用户名
    const updatePromises = [];
    
    // 更新分判商基本信息
    const distributorUpdate = this.prisma.distributor.update({
      where: { id: distributorId },
      data: {
        name: updateData.name,
        contactName: updateData.contactName,
        phone: updateData.phone,
        email: updateData.email,
        whatsapp: updateData.whatsapp
      }
    });
    updatePromises.push(distributorUpdate);
    
    // 如果提供了新用户名，更新用户表中的用户名
    if (username && username !== existingDistributor.user.username) {
      const userUpdate = this.prisma.user.update({
        where: { id: existingDistributor.userId },
        data: { username: username }
      });
      updatePromises.push(userUpdate);
    }
    
    // 等待所有更新完成
    await Promise.all(updatePromises);
    
    // 获取更新后的完整数据
    const updatedDistributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true
          }
        },
        sites: {
          include: {
            site: true
          }
        }
      }
    });

    // 更新工地关联关系
    if (validSiteIds.length >= 0) {
      // 删除现有关联关系
      await this.prisma.siteDistributor.deleteMany({
        where: { distributorId: distributorId }
      });

      // 创建新的关联关系
      if (validSiteIds.length > 0) {
        await this.prisma.siteDistributor.createMany({
          data: validSiteIds.map(siteId => ({
            siteId: siteId,
            distributorId: distributorId
          }))
        });
      }
    }

    // 转换数据格式以匹配前端期望
    return {
      ...updatedDistributor,
      siteIds: validSiteIds
    };
  }

  // 生成唯一的分判商编号
  private async generateDistributorId(): Promise<string> {
    let distributorId: string;
    let isUnique = false;
    
    while (!isUnique) {
      // 生成D开头的8位随机编号（包含数字和字母）
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomPart = '';
      for (let i = 0; i < 7; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      distributorId = `D${randomPart}`;
      
      // 检查编号是否已存在
      const existingDistributor = await this.prisma.distributor.findUnique({
        where: { distributorId: distributorId }
      });
      
      if (!existingDistributor) {
        isUnique = true;
      }
    }
    
    return distributorId;
  }

  // 生成唯一的门卫编号
  private async generateGuardId(): Promise<string> {
    let guardId: string;
    let isUnique = false;
    
    while (!isUnique) {
      // 生成G开头的6位随机编号
      const randomNumber = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      guardId = `G${randomNumber}`;
      
      // 检查编号是否已存在
      const existingGuard = await this.prisma.guard.findUnique({
        where: { guardId: guardId }
      });
      
      if (!existingGuard) {
        isUnique = true;
      }
    }
    
    return guardId;
  }

  // 创建门卫
  async createGuard(user: CurrentUser, guardData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建门卫');
    }

    // 使用提供的门卫编号或自动生成
    let guardId = guardData.guardId;
    if (!guardId) {
      guardId = await this.generateGuardId();
    } else {
      // 检查门卫编号是否已存在
      const existingGuard = await this.prisma.guard.findUnique({
        where: { guardId: guardId }
      });
      if (existingGuard) {
        throw new ConflictException('门卫编号已存在');
      }
    }

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username: guardData.username }
    });
    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查工地是否存在（支持通过ID或编号查找）
    let siteId = guardData.siteId;
    if (guardData.siteId) {
      // 先尝试通过ID查找
      let existingSite = await this.prisma.site.findUnique({
        where: { id: guardData.siteId }
      });
      
      // 如果通过ID找不到，尝试通过编号查找
      if (!existingSite) {
        existingSite = await this.prisma.site.findUnique({
          where: { code: guardData.siteId }
        });
        if (existingSite) {
          siteId = existingSite.id; // 使用找到的工地的ID
        }
      }
      
      if (!existingSite) {
        throw new BadRequestException('指定的工地不存在');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(guardData.password, 10);

    // 创建用户
    const newUser = await this.prisma.user.create({
      data: {
        username: guardData.username,
        password: hashedPassword,
        role: 'GUARD',
        status: 'ACTIVE'
      }
    });

    // 创建门卫
    return this.prisma.guard.create({
      data: {
        guardId: guardId,
        name: guardData.name,
        siteId: siteId,
        phone: guardData.phone,
        email: guardData.email,
        whatsapp: guardData.whatsapp,
        userId: newUser.id
      },
      include: {
        user: {
          select: {
            username: true,
            status: true
          }
        },
        site: true
      }
    });
  }

  // 更新用户状态
  async updateUserStatus(user: CurrentUser, userId: string, status: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以更新用户状态');
    }

    // 验证状态值
    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      throw new BadRequestException('无效的状态值，只允许 ACTIVE 或 DISABLED');
    }

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new BadRequestException('用户不存在');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      include: {
        distributor: true,
        guard: true
      }
    });
  }

  // 获取系统日志（这里可以扩展为真正的日志系统）
  async getSystemLogs(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问系统日志');
    }

    // 这里可以返回一些基本的系统活动记录
    // 在实际应用中，应该有一个专门的日志表
    return {
      message: '系统日志功能待实现',
      lastLogin: new Date().toISOString(),
      systemUptime: '系统运行正常'
    };
  }

  // 生成工地编号
  private async generateSiteCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let siteCode: string;
    let exists = true;
    
    while (exists) {
      siteCode = 'S';
      for (let i = 0; i < 8; i++) {
        siteCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      const existingSite = await this.prisma.site.findUnique({
        where: { code: siteCode }
      });
      exists = !!existingSite;
    }
    
    return siteCode;
  }

  // 创建工地
  async createSite(user: CurrentUser, siteData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建工地');
    }

    const { name, address, code, manager, phone, status = 'ACTIVE', distributorIds = [] } = siteData;

    // 验证必填字段
    if (!name || !address) {
      throw new BadRequestException('工地名称和地址为必填项');
    }

    // 生成或验证工地代码
    let siteCode = code;
    if (!siteCode) {
      siteCode = await this.generateSiteCode();
    } else {
      // 检查工地代码是否已存在
      const existingSite = await this.prisma.site.findUnique({
        where: { code: siteCode }
      });
      if (existingSite) {
        throw new ConflictException('工地代码已存在');
      }
    }

    // 创建工地
    const site = await this.prisma.site.create({
      data: {
        name,
        address,
        code: siteCode,
        manager,
        phone,
        status: status.toUpperCase() as any, // 转换为大写以匹配枚举
      },
      include: {
        distributors: {
          include: {
            distributor: true
          }
        },
        guards: true,
        workers: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // 如果有关联的分判商，创建关联关系
    if (distributorIds && distributorIds.length > 0) {
      const siteDistributorData = distributorIds.map((distributorId: string) => ({
        siteId: site.id,
        distributorId
      }));

      await this.prisma.siteDistributor.createMany({
        data: siteDistributorData
      });

      // 重新查询以包含关联的分判商
      return this.prisma.site.findUnique({
        where: { id: site.id },
        include: {
          distributors: {
            include: {
              distributor: true
            }
          },
          guards: true,
          workers: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });
    }

    return site;
  }

  // 更新工地
  async updateSite(user: CurrentUser, siteId: string, siteData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以更新工地');
    }

    const { name, address, code, manager, phone, status = 'ACTIVE', distributorIds = [] } = siteData;

    // 验证必填字段
    if (!name || !address) {
      throw new BadRequestException('工地名称和地址为必填项');
    }

    // 检查工地是否存在
    const existingSite = await this.prisma.site.findUnique({
      where: { id: siteId }
    });

    if (!existingSite) {
      throw new NotFoundException('工地不存在');
    }

    // 如果提供了新的工地代码，检查是否与其他工地冲突
    if (code && code !== existingSite.code) {
      const codeExists = await this.prisma.site.findUnique({
        where: { code: code }
      });
      if (codeExists) {
        throw new ConflictException('工地代码已存在');
      }
    }

    // 更新工地
    const updatedSite = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        name,
        address,
        code: code || existingSite.code, // 如果没有提供新代码，保持原代码
        manager,
        phone,
        status: status.toUpperCase() as any,
      },
      include: {
        distributors: {
          include: {
            distributor: true
          }
        },
        guards: true,
        workers: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // 更新关联的分判商
    if (distributorIds && distributorIds.length >= 0) {
      // 删除现有的关联关系
      await this.prisma.siteDistributor.deleteMany({
        where: { siteId: siteId }
      });

      // 创建新的关联关系
      if (distributorIds.length > 0) {
        const siteDistributorData = distributorIds.map((distributorId: string) => ({
          siteId: siteId,
          distributorId
        }));

        await this.prisma.siteDistributor.createMany({
          data: siteDistributorData
        });
      }

      // 重新查询以包含关联的分判商
      return this.prisma.site.findUnique({
        where: { id: siteId },
        include: {
          distributors: {
            include: {
              distributor: true
            }
          },
          guards: true,
          workers: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });
    }

    return updatedSite;
  }

  // 重置分判商密码
  async resetDistributorPassword(user: CurrentUser, distributorId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以重置分判商密码');
    }

    // 查找分判商
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { user: true }
    });

    if (!distributor) {
      throw new BadRequestException('分判商不存在');
    }

    if (!distributor.user) {
      throw new BadRequestException('分判商没有关联的用户账号');
    }

    // 生成新密码（默认密码）
    const newPassword = 'Pass@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新用户密码
    const updatedUser = await this.prisma.user.update({
      where: { id: distributor.userId },
      data: { password: hashedPassword }
    });

    return {
      distributorId: distributor.id,
      distributorName: distributor.name,
      username: distributor.user.username,
      newPassword: newPassword
    };
  }

  // 重置门卫密码
  async resetGuardPassword(user: CurrentUser, guardId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以重置门卫密码');
    }

    // 查找门卫
    const guard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { user: true }
    });

    if (!guard) {
      throw new BadRequestException('门卫不存在');
    }

    if (!guard.user) {
      throw new BadRequestException('门卫没有关联的用户账号');
    }

    // 生成新密码（默认密码）
    const newPassword = 'Pass@123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新用户密码
    const updatedUser = await this.prisma.user.update({
      where: { id: guard.userId },
      data: { password: hashedPassword }
    });

    return {
      guardId: guard.id,
      guardName: guard.name,
      username: guard.user.username,
      newPassword: newPassword
    };
  }

  // 更新门卫信息
  async updateGuard(user: CurrentUser, guardId: string, guardData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以更新门卫');
    }

    // 查找门卫
    const existingGuard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { user: true }
    });

    if (!existingGuard) {
      throw new BadRequestException('门卫不存在');
    }

    const { username, ...updateData } = guardData;

    // 如果提供了新用户名，检查是否已存在
    if (username && username !== existingGuard.user.username) {
      const existingUser = await this.prisma.user.findUnique({
        where: { username: username }
      });
      
      if (existingUser) {
        throw new ConflictException('用户名已存在');
      }
    }

    // 更新门卫基本信息和用户名
    const updatePromises = [];
    
    // 更新门卫基本信息
    const guardUpdate = this.prisma.guard.update({
      where: { id: guardId },
      data: {
        name: updateData.name,
        phone: updateData.phone,
        email: updateData.email,
        whatsapp: updateData.whatsapp,
        siteId: updateData.siteId
      }
    });
    updatePromises.push(guardUpdate);
    
    // 如果提供了新用户名，更新用户表中的用户名
    if (username && username !== existingGuard.user.username) {
      const userUpdate = this.prisma.user.update({
        where: { id: existingGuard.userId },
        data: { username: username }
      });
      updatePromises.push(userUpdate);
    }
    
    // 等待所有更新完成
    await Promise.all(updatePromises);
    
    // 获取更新后的完整数据
    const updatedGuard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: {
        user: {
          select: {
            username: true,
            status: true,
            createdAt: true
          }
        },
        site: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return {
      ...updatedGuard,
      userId: updatedGuard.userId
    };
  }

  // 删除门卫
  async deleteGuard(user: CurrentUser, guardId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除门卫');
    }

    // 查找门卫
    const guard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { user: true }
    });

    if (!guard) {
      throw new BadRequestException('门卫不存在');
    }

    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (prisma) => {
      // 先删除门卫记录
      await prisma.guard.delete({
        where: { id: guardId }
      });
      
      // 再删除关联的用户账户
      await prisma.user.delete({
        where: { id: guard.userId }
      });
    });

    return {
      guardId: guard.id,
      guardName: guard.name,
      username: guard.user.username
    };
  }

  // 删除分判商
  async deleteDistributor(user: CurrentUser, distributorId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以删除分判商');
    }

    // 查找分判商
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      include: { user: true }
    });

    if (!distributor) {
      throw new BadRequestException('分判商不存在');
    }

    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (prisma) => {
      // 先删除分判商记录
      await prisma.distributor.delete({
        where: { id: distributorId }
      });
      
      // 再删除关联的用户账户
      await prisma.user.delete({
        where: { id: distributor.userId }
      });
    });

    return {
      distributorId: distributor.id,
      distributorName: distributor.name,
      username: distributor.user.username
    };
  }

  // 切换门卫账户状态
  async toggleGuardStatus(user: CurrentUser, guardId: string) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以切换门卫状态');
    }

    // 查找门卫
    const guard = await this.prisma.guard.findUnique({
      where: { id: guardId },
      include: { user: true }
    });

    if (!guard) {
      throw new BadRequestException('门卫不存在');
    }

    if (!guard.user) {
      throw new BadRequestException('门卫没有关联的用户账号');
    }

    // 切换状态
    const newStatus = guard.user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    
    const updatedUser = await this.prisma.user.update({
      where: { id: guard.userId },
      data: { status: newStatus }
    });

    return {
      guardId: guard.id,
      guardName: guard.name,
      username: guard.user.username,
      oldStatus: guard.user.status,
      newStatus: newStatus
    };
  }

  // 导出工人数据
  async exportWorkers(user: CurrentUser, filters: { siteId?: string; distributorId?: string; status?: string }) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以导出工人数据');
    }

    const where: any = {};
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.distributorId) where.distributorId = filters.distributorId;
    if (filters.status) where.status = filters.status;

    const workers = await this.prisma.worker.findMany({
      where,
      include: {
        distributor: true,
        site: true
      }
    });

    return {
      workers: workers.map(worker => ({
        workerId: worker.workerId,
        name: worker.name,
        gender: worker.gender,
        idType: worker.idType,
        idNumber: worker.idNumber,
        region: worker.region,
        distributorName: worker.distributor?.name || '',
        distributorId: worker.distributor?.distributorId || '',
        siteName: worker.site?.name || '',
        siteCode: worker.site?.code || '',
        phone: worker.phone,
        email: worker.email,
        whatsapp: worker.whatsapp,
        status: worker.status,
        birthDate: worker.birthDate,
        createdAt: worker.createdAt,
        updatedAt: worker.updatedAt
      }))
    };
  }

  // 导入工人数据
  async importWorkers(user: CurrentUser, workersData: any[]) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以导入工人数据');
    }

    const results = {
      success: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [] as string[]
    };

    for (let i = 0; i < workersData.length; i++) {
      const workerData = workersData[i];
      
      try {
        // 检查必填字段
        if (!workerData.name || !workerData.gender || !workerData.idNumber || !workerData.phone) {
          results.errors++;
          results.errorDetails.push(`第${i + 1}行：缺少必填字段`);
          continue;
        }

        // 验证分判商是否存在（通过distributorId字段）
        let actualDistributorId = null;
        if (workerData.distributorId) {
          const distributor = await this.prisma.distributor.findUnique({
            where: { distributorId: workerData.distributorId }
          });
          if (!distributor) {
            results.errors++;
            results.errorDetails.push(`第${i + 1}行：分判商ID "${workerData.distributorId}" 不存在`);
            continue;
          }
          actualDistributorId = distributor.id; // 使用主键ID
        }

        // 验证工地是否存在（通过code字段）
        let actualSiteId = null;
        if (workerData.siteId) {
          const site = await this.prisma.site.findUnique({
            where: { code: workerData.siteId }
          });
          if (!site) {
            results.errors++;
            results.errorDetails.push(`第${i + 1}行：工地ID "${workerData.siteId}" 不存在`);
            continue;
          }
          actualSiteId = site.id; // 使用主键ID
        }

        // 检查证件号码是否已存在
        const existingWorker = await this.prisma.worker.findUnique({
          where: { idNumber: workerData.idNumber }
        });

        if (existingWorker) {
          results.skipped++;
          continue;
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
            results.errors++;
            results.errorDetails.push(`第${i + 1}行：工人编号已存在`);
            continue;
          }
        }

        // 检查必需的外键字段
        if (!actualDistributorId) {
          results.errors++;
          results.errorDetails.push(`第${i + 1}行：分判商ID不能为空`);
          continue;
        }

        if (!actualSiteId) {
          results.errors++;
          results.errorDetails.push(`第${i + 1}行：工地代码不能为空`);
          continue;
        }

        // 处理可选字段，使用实际的主键ID
        const processedData = {
          ...workerData,
          workerId: workerId.trim(),
          email: workerData.email || null,
          whatsapp: workerData.whatsapp || null,
          birthDate: workerData.birthDate ? new Date(workerData.birthDate) : null,
          // 使用实际的主键ID
          distributorId: actualDistributorId,
          siteId: actualSiteId
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

  // 下载工人导入模板
  async downloadWorkerTemplate(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以下载工人模板');
    }

    // 获取分判商和工地列表用于模板
    const [distributors, sites] = await Promise.all([
      this.prisma.distributor.findMany({ select: { id: true, name: true } }),
      this.prisma.site.findMany({ select: { id: true, name: true } })
    ]);

    return {
      template: {
        headers: [
          '工人编号',
          '姓名',
          '性别',
          '身份证号',
          '地区',
          '分判商',
          '所属工地',
          '联系电话',
          '邮箱',
          'WhatsApp',
          '状态',
          '出生日期'
        ],
        sampleData: [
          {
            '工人编号': 'WK1234567890',
            '姓名': '张三',
            '性别': '男',
            '身份证号': '123456789012345678',
            '地区': '中国大陆',
            '分判商': distributors[0]?.name || '示例分判商',
            '所属工地': sites[0]?.name || '示例工地',
            '联系电话': '13800138000',
            '邮箱': 'zhangsan@example.com',
            'WhatsApp': '13800138000',
            '状态': '在职',
            '出生日期': '1990-01-01'
          }
        ],
        distributors,
        sites
      }
    };
  }

  // 获取所有借用物品记录（管理员用）
  async getAllBorrowRecords(user: CurrentUser, filters?: {
    siteId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问所有借用记录');
    }

    const whereClause: any = {};

    if (filters?.siteId) {
      whereClause.siteId = filters.siteId;
    }

    if (filters?.status) {
      whereClause.status = filters.status.toUpperCase();
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.borrowDate = {};
      if (filters.startDate) {
        // 创建本地时间的开始日期（00:00:00）
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        whereClause.borrowDate.gte = startDate;
      }
      if (filters.endDate) {
        // 创建本地时间的结束日期（23:59:59）
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereClause.borrowDate.lte = endDate;
      }
    }

    const records = await this.prisma.itemBorrowRecord.findMany({
      where: whereClause,
      include: {
        worker: {
          include: {
            distributor: true,
            site: true,
            visitorRecords: {
              where: {
                status: 'ON_SITE'
              },
              orderBy: {
                checkInTime: 'desc'
              },
              take: 1
            }
          }
        },
        item: {
          include: {
            category: true
          }
        },
        site: true,
        borrowHandler: true,
        returnHandler: true
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    return records;
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
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以导入工人数据');
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
        // console.log(`第${index + 1}行原始数据:`, row);
        // console.log(`第${index + 1}行字段名:`, fieldNames);
        
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

        const workerData = {
          name: getValue(row['姓名'] || row['name'] || row['Name']) || '',
          gender: this.normalizeGender(getValue(row['性别'] || row['gender'] || row['Gender']) || ''),
          idNumber: getValue(row['证件号码'] || row['idNumber'] || row['ID Number'] || row['身份证号'] || row['idCard'] || row['ID Card'] || row['身份证']) || '',
          phone: getValue(row['手机号'] || row['phone'] || row['Phone'] || row['手机']) || '',
          email: getValue(row['邮箱'] || row['email'] || row['Email']),
          whatsapp: getValue(row['WhatsApp'] || row['whatsapp']),
          birthDate: getValue(row['出生日期'] || row['birthDate'] || row['Birth Date']),
          region: areaCode, // 保存识别出的区号
          siteId: getValue(row['工地代码'] || row['siteCode'] || row['Site Code'] || row['工地ID'] || row['siteId'] || row['Site ID']),
          distributorId: getValue(row['分判商ID'] || row['distributorId'] || row['Distributor ID']),
          status: this.normalizeWorkerStatus(getValue(row['状态'] || row['status'] || row['Status']) || ''),
          workerId: getValue(row['工人编号'] || row['workerId'] || row['Worker ID'])
        };
        
        // console.log(`第${index + 1}行转换后数据:`, workerData);
        return workerData;
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
