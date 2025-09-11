import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import * as bcrypt from 'bcryptjs';

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

    return this.prisma.distributor.findMany({
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

  // 获取所有门卫列表
  async getAllGuards(user: CurrentUser) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以访问所有门卫');
    }

    return this.prisma.guard.findMany({
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

  // 创建分销商
  async createDistributor(user: CurrentUser, distributorData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建分销商');
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
    return this.prisma.distributor.create({
      data: {
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
  }

  // 创建门卫
  async createGuard(user: CurrentUser, guardData: any) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以创建门卫');
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
        guardId: guardData.guardId,
        name: guardData.name,
        siteId: guardData.siteId,
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
}
