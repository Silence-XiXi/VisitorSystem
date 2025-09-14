import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

    return this.prisma.worker.create({
      data: {
        ...workerData,
        workerId,
        distributorId: distributor.id
      },
      include: {
        site: true
      }
    });
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
