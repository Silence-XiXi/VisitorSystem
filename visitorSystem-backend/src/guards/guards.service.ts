import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class GuardsService {
  constructor(private prisma: PrismaService) {}

  // 获取当前门卫信息
  async getCurrentGuard(user: CurrentUser) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id },
      include: {
        site: {
          include: {
            distributors: {
              include: {
                distributor: true
              }
            }
          }
        }
      }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    return guard;
  }

  // 获取门卫所在工地的工人列表
  async getSiteWorkers(user: CurrentUser) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    const workers = await this.prisma.worker.findMany({
      where: { siteId: guard.siteId },
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

  // 获取门卫所在工地的物品借用记录
  async getSiteBorrowRecords(user: CurrentUser, status?: string, workerId?: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    const whereClause: any = {
      siteId: guard.siteId
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (workerId) {
      whereClause.workerId = workerId;
    }

    const records = await this.prisma.itemBorrowRecord.findMany({
      where: whereClause,
      include: {
        worker: {
          include: {
            distributor: true
          }
        },
        item: {
          include: {
            category: true
          }
        },
        site: true
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    return records;
  }

  // 创建物品借用记录
  async createBorrowRecord(user: CurrentUser, recordData: any) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以创建借用记录');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 验证工人是否在该工地
    const worker = await this.prisma.worker.findFirst({
      where: {
        id: recordData.workerId,
        siteId: guard.siteId
      }
    });

    if (!worker) {
      throw new ForbiddenException('该工人不在您管理的工地');
    }

    // 验证物品是否可用
    const item = await this.prisma.item.findFirst({
      where: {
        id: recordData.itemId,
        status: 'AVAILABLE'
      }
    });

    if (!item) {
      throw new ForbiddenException('该物品不可借用');
    }

    // 创建借用记录
    const borrowRecord = await this.prisma.itemBorrowRecord.create({
      data: {
        ...recordData,
        siteId: guard.siteId,
        borrowHandlerId: guard.id,
        status: 'BORROWED'
      },
      include: {
        worker: {
          include: {
            distributor: true
          }
        },
        item: {
          include: {
            category: true
          }
        },
        site: true
      }
    });

    // 更新物品状态为已借出
    await this.prisma.item.update({
      where: { id: recordData.itemId },
      data: { status: 'BORROWED' }
    });

    return borrowRecord;
  }

  // 归还物品
  async returnItem(user: CurrentUser, recordId: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以处理归还');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    const record = await this.prisma.itemBorrowRecord.findFirst({
      where: {
        id: recordId,
        siteId: guard.siteId,
        status: 'BORROWED'
      }
    });

    if (!record) {
      throw new NotFoundException('借用记录不存在或已归还');
    }

    // 更新借用记录
    const updatedRecord = await this.prisma.itemBorrowRecord.update({
      where: { id: recordId },
      data: {
        status: 'RETURNED',
        returnDate: new Date(),
        returnHandlerId: guard.id
      },
      include: {
        worker: {
          include: {
            distributor: true
          }
        },
        item: {
          include: {
            category: true
          }
        },
        site: true
      }
    });

    // 更新物品状态为可用
    await this.prisma.item.update({
      where: { id: record.itemId },
      data: { status: 'AVAILABLE' }
    });

    return updatedRecord;
  }

  // 获取门卫统计数据
  async getGuardStats(user: CurrentUser) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问统计数据');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    const [totalWorkers, activeWorkers, borrowedItems, returnedItems] = await Promise.all([
      this.prisma.worker.count({
        where: { siteId: guard.siteId }
      }),
      this.prisma.worker.count({
        where: { 
          siteId: guard.siteId,
          status: 'ACTIVE'
        }
      }),
      this.prisma.itemBorrowRecord.count({
        where: {
          siteId: guard.siteId,
          status: 'BORROWED'
        }
      }),
      this.prisma.itemBorrowRecord.count({
        where: {
          siteId: guard.siteId,
          status: 'RETURNED'
        }
      })
    ]);

    return {
      totalWorkers,
      activeWorkers,
      inactiveWorkers: totalWorkers - activeWorkers,
      borrowedItems,
      returnedItems
    };
  }
}
