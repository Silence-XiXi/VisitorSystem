import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

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
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let workerId: string;
    let exists: boolean;

    do {
      // 生成WK开头的10位编号
      workerId = 'WK' + Array.from({ length: 8 }, () => 
        characters.charAt(Math.floor(Math.random() * characters.length))
      ).join('');
      
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

    // 生成工人编号
    const workerId = await this.generateWorkerId();

    try {
      return await this.prisma.worker.create({
        data: {
          ...workerData,
          workerId,
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
        if (errorMessage.includes('idCard') || errorMessage.includes('身份证')) {
          throw new ConflictException('身份证号已存在');
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

    return this.prisma.worker.update({
      where: { id: workerId },
      data: updateData,
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
}
