import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // 根据工人编号查询工人信息
  async getWorkerByWorkerId(user: CurrentUser, workerId: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    const worker = await this.prisma.worker.findFirst({
      where: { 
        workerId: workerId,
        siteId: guard.siteId  // 确保工人属于门卫所在的工地
      },
      include: {
        distributor: true,
        site: true
      }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在或不属于当前工地');
    }

    return worker;
  }

  // 根据工人编号或实体卡编号查询工人信息
  async getWorkerByIdentifier(user: CurrentUser, identifier: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 首先尝试通过工人编号查找
    let worker = await this.prisma.worker.findFirst({
      where: { 
        workerId: identifier,
        siteId: guard.siteId  // 确保工人属于门卫所在的工地
      },
      include: {
        distributor: true,
        site: true
      }
    });

    // 如果通过工人编号没找到，尝试通过实体卡编号查找
    if (!worker) {
      const visitorRecord = await this.prisma.visitorRecord.findFirst({
        where: {
          physicalCardId: identifier,
          siteId: guard.siteId,
          status: 'ON_SITE'  // 只查找当前在场的记录
        },
        include: {
          worker: {
            include: {
              distributor: true,
              site: true
            }
          }
        },
        orderBy: {
          checkInTime: 'desc'
        }
      });

      if (visitorRecord) {
        worker = visitorRecord.worker;
      }
    }

    // 如果仍然没有找到，尝试通过手机号查找
    if (!worker) {
      // 先从 worker 表中查询手机号
      worker = await this.prisma.worker.findFirst({
        where: { 
          phone: identifier,
          siteId: guard.siteId  // 确保工人属于门卫所在的工地
        },
        include: {
          distributor: true,
          site: true
        }
      });
      
      // 如果在 worker 表中没有找到，尝试从 visitor_records 表中查询手机号
      if (!worker) {
        const visitorRecord = await this.prisma.visitorRecord.findFirst({
          where: {
            phone: identifier,
            siteId: guard.siteId
          },
          include: {
            worker: {
              include: {
                distributor: true,
                site: true
              }
            }
          },
          orderBy: {
            checkInTime: 'desc'
          }
        });

        if (visitorRecord && visitorRecord.worker) {
          worker = visitorRecord.worker;
        }
      }
    }

    if (!worker) {
      throw new NotFoundException('工人不存在或不属于当前工地');
    }

    return worker;
  }
  
  // 根据工人手机号查询工人信息
  async getWorkerByPhone(user: CurrentUser, phone: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 先从 worker 表中查询
    let worker = await this.prisma.worker.findFirst({
      where: { 
        phone: phone,
        siteId: guard.siteId  // 确保工人属于门卫所在的工地
      },
      include: {
        distributor: true,
        site: true
      }
    });

    // 如果在 worker 表中没有找到，尝试从 visitor_records 表中查询
    if (!worker) {
      const visitorRecord = await this.prisma.visitorRecord.findFirst({
        where: {
          phone: phone,
          siteId: guard.siteId
        },
        include: {
          worker: {
            include: {
              distributor: true,
              site: true
            }
          }
        },
        orderBy: {
          checkInTime: 'desc'
        }
      });

      if (visitorRecord && visitorRecord.worker) {
        worker = visitorRecord.worker;
      }
    }

    if (!worker) {
      throw new NotFoundException('未找到该手机号对应的工人或工人不属于当前工地');
    }

    return worker;
  }

  // 检查工人是否有有效的入场记录
  async checkWorkerEntryRecord(user: CurrentUser, identifier: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 先尝试判断是否为手机号
    const isPhoneNumber = /^\d{8,11}$/.test(identifier) || /^1[3-9]\d{9}$/.test(identifier);
    
    // 如果是手机号，先尝试查找工人
    let workerId = identifier;
    if (isPhoneNumber) {
      // 先从 worker 表中查询
      const worker = await this.prisma.worker.findFirst({
        where: { 
          phone: identifier,
          siteId: guard.siteId
        }
      });
      
      if (worker) {
        workerId = worker.workerId;
      } else {
        // 如果在 worker 表中没有找到，尝试从 visitor_records 表中查询
        const visitorRecord = await this.prisma.visitorRecord.findFirst({
          where: {
            phone: identifier,
            siteId: guard.siteId
          },
          include: {
            worker: true
          },
          orderBy: {
            checkInTime: 'desc'
          }
        });
        
        if (visitorRecord && visitorRecord.worker) {
          workerId = visitorRecord.worker.workerId;
        }
      }
    }
    
    // 查找有效的入场记录（状态为ON_SITE）
    let entryRecord = await this.prisma.visitorRecord.findFirst({
      where: {
        OR: [
          {
            worker: {
              workerId: workerId,
              siteId: guard.siteId
            }
          },
          {
            physicalCardId: identifier,
            siteId: guard.siteId
          }
        ],
        status: 'ON_SITE'
      },
      include: {
        worker: {
          include: {
            distributor: true,
            site: true
          }
        },
        site: true,
        registrar: true
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!entryRecord) {
      throw new BadRequestException('该工人未入场，无法借用物品');
    }

    // 获取工人的当前借用物品（未归还的）
    const currentBorrowedItems = await this.prisma.itemBorrowRecord.findMany({
      where: {
        workerId: entryRecord.worker.id,
        status: 'BORROWED' // 只获取未归还的物品
      },
      include: {
        item: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    return {
      worker: entryRecord.worker,
      entryRecord: entryRecord,
      currentBorrowedItems: currentBorrowedItems
    };
  }

  // 获取门卫所在工地的物品借用记录
  async getSiteBorrowRecords(user: CurrentUser, status?: string, workerId?: string, visitorRecordId?: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    // // console.log(`获取物品借用记录 - user: ${user.username}, status: ${status}, workerId: ${workerId}, visitorRecordId: ${visitorRecordId}`);

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // // console.log(`门卫信息: ${guard.id}, siteId: ${guard.siteId}`);

    const whereClause: any = {
      siteId: guard.siteId
    };

    // 如果提供了访客记录ID，优先使用访客记录ID进行筛选
    if (visitorRecordId) {
      // // console.log(`使用访客记录ID过滤: ${visitorRecordId}`);
      whereClause.visitorRecordId = visitorRecordId;
    }
    // 如果没有提供访客记录ID，但提供了工人ID，则使用工人ID筛选
    else if (workerId) {
      // 查找对应的工人
      const worker = await this.prisma.worker.findFirst({
        where: {
          OR: [
            { workerId },  // 尝试匹配工号
            { id: workerId }  // 尝试匹配数据库ID
          ]
        }
      });

      if (worker) {
        // // console.log(`找到工人: ${worker.id}, workerId: ${worker.workerId}, name: ${worker.name}`);
        whereClause.workerId = worker.id;  // 使用工人的数据库ID
      } else {
        // // console.log(`未找到工人, 使用原始workerId: ${workerId}`);
        whereClause.workerId = workerId;
      }
    }

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // // console.log('借用记录查询条件:', whereClause);

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
        site: true,
        visitorRecord: true // 包含关联的访客记录
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    // // console.log(`找到借用记录: ${records.length}条`);
    // if (records.length > 0) {
    //   // console.log('第一条记录示例:', JSON.stringify(records[0], null, 2).substring(0, 200) + '...');
    // }

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

    // // console.log('收到借用记录请求:', {
    //   workerId: recordData.workerId,
    //   categoryId: recordData.categoryId,
    //   itemCode: recordData.itemCode,
    //   guardId: guard.id,
    //   siteId: guard.siteId
    // });

    // 验证工人是否在该工地
    const worker = await this.prisma.worker.findFirst({
      where: {
        workerId: recordData.workerId,
        siteId: guard.siteId
      }
    });

    // 如果通过workerId没有找到，可能是传递了数据库ID，尝试通过id查找
    if (!worker) {
      const workerById = await this.prisma.worker.findFirst({
        where: {
          id: recordData.workerId,
          siteId: guard.siteId
        }
      });
      
      if (!workerById) {
        throw new ForbiddenException('该工人不在您管理的工地');
      }
      
      return workerById;
    }
    
    // // console.log('查找到的工人信息:', worker ? {
    //   id: worker.id,
    //   workerId: worker.workerId,
    //   name: worker.name,
    //   siteId: worker.siteId
    // } : '未找到工人');

    if (!worker) {
      throw new ForbiddenException('该工人不在您管理的工地');
    }

    // 检查工人是否已经有有效的入场记录
    const visitorRecord = await this.prisma.visitorRecord.findFirst({
      where: {
        workerId: worker.id,
        status: 'ON_SITE'
      }
    });

    // // console.log('查找到的访客记录:', visitorRecord ? {
    //   id: visitorRecord.id,
    //   workerId: visitorRecord.workerId,
    //   status: visitorRecord.status,
    //   checkInTime: visitorRecord.checkInTime
    // } : '未找到有效的入场记录');

    // 如果工人没有入场记录，禁止借物
    if (!visitorRecord) {
      throw new ForbiddenException('该工人未入场，无法借用物品，请先进行入场登记');
    }

    // 验证物品类型是否存在
    const category = await this.prisma.itemCategory.findUnique({
      where: { id: recordData.categoryId }
    });

    if (!category) {
      throw new NotFoundException('物品类型不存在');
    }

    // 查找或创建物品
    let item = await this.prisma.item.findFirst({
      where: {
        itemCode: recordData.itemCode,
        categoryId: recordData.categoryId
      }
    });

    if (!item) {
      // 如果物品不存在，创建新物品
      item = await this.prisma.item.create({
        data: {
          itemCode: recordData.itemCode,
          name: `${category.name} - ${recordData.itemCode}`,
          description: recordData.remark || '',
          categoryId: recordData.categoryId,
          status: 'AVAILABLE'
        }
      });
    } else if (item.status !== 'AVAILABLE') {
      throw new ForbiddenException('该物品不可借用');
    }

    // 创建借用记录（关联当前有效的访客记录）
    // // console.log('创建借用记录，关联访客记录:', {
    //   workerId: worker.id,
    //   workerIdNumber: worker.workerId,
    //   visitorRecordId: visitorRecord.id,
    //   itemId: item.id,
    //   itemCode: item.itemCode
    // });
    
    const borrowRecord = await this.prisma.itemBorrowRecord.create({
      data: {
        workerId: worker.id, // 使用数据库中的工人ID
        itemId: item.id,
        siteId: guard.siteId,
        borrowHandlerId: guard.id,
        borrowDate: recordData.borrowDate || new Date(),
        borrowTime: recordData.borrowTime || new Date().toTimeString().split(' ')[0],
        status: 'BORROWED',
        notes: recordData.notes || null,
        visitorRecordId: visitorRecord.id // 关联到访客记录
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
      where: { id: item.id },
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

    // 计算归还时间逻辑
    const now = new Date();
    const borrowDate = new Date(record.borrowDate);
    const isSameDay = now.toDateString() === borrowDate.toDateString();
    
    // 如果是同一天归还，只保存时间；如果是第二天归还，保存日期和时间
    const returnDate = isSameDay ? borrowDate : now;
    const returnTime = now.toTimeString().split(' ')[0]; // 格式: HH:mm:ss
    
    // 计算借用时长（分钟）
    // 将借用日期和时间组合成完整的 DateTime
    const borrowDateTime = new Date(record.borrowDate);
    const [borrowHour, borrowMinute, borrowSecond] = record.borrowTime.split(':').map(Number);
    borrowDateTime.setHours(borrowHour, borrowMinute, borrowSecond || 0, 0);
    
    // 将归还日期和时间组合成完整的 DateTime
    const returnDateTime = new Date(returnDate);
    const [returnHour, returnMinute, returnSecond] = returnTime.split(':').map(Number);
    returnDateTime.setHours(returnHour, returnMinute, returnSecond || 0, 0);
    
    // 计算时间差（毫秒），然后转换为分钟
    const borrowDurationMs = returnDateTime.getTime() - borrowDateTime.getTime();
    const borrowDurationMinutes = Math.round(borrowDurationMs / (1000 * 60)); // 四舍五入到最接近的分钟
    
    // 更新借用记录
    const updatedRecord = await this.prisma.itemBorrowRecord.update({
      where: { id: recordId },
      data: {
        status: 'RETURNED',
        returnDate: returnDate,
        returnTime: returnTime,
        returnHandlerId: guard.id,
        borrowDuration: borrowDurationMinutes
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

    // 获取今日日期范围
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [
      totalWorkers, 
      activeWorkers, 
      borrowedItems, 
      returnedItems,
      todayVisitorRecords,
      todayEntered,
      todayExited,
      onSiteWorkers
    ] = await Promise.all([
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
      }),
      // 今日访客记录总数
      this.prisma.visitorRecord.count({
        where: {
          siteId: guard.siteId,
          createdAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      // 今日入场人数
      this.prisma.visitorRecord.count({
        where: {
          siteId: guard.siteId,
          checkInTime: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      // 今日离场人数（只统计今日入场并且今日离场的记录）
      this.prisma.visitorRecord.count({
        where: {
          siteId: guard.siteId,
          checkInTime: {
            gte: startOfDay,
            lt: endOfDay
          },
          checkOutTime: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      }),
      // 当前在场人数
      this.prisma.visitorRecord.count({
        where: {
          siteId: guard.siteId,
          status: 'ON_SITE'
        }
      })
    ]);

    return {
      totalWorkers,
      activeWorkers,
      inactiveWorkers: totalWorkers - activeWorkers,
      borrowedItems,
      returnedItems,
      todayVisitorRecords,
      todayEntered,
      todayExited,
      onSiteWorkers
    };
  }

  // 通过实体卡编号查询访客记录
  async getVisitorRecordByPhysicalCardId(user: CurrentUser, physicalCardId: string) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问此接口');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 查找有效的入场记录（状态为ON_SITE）
    const entryRecord = await this.prisma.visitorRecord.findFirst({
      where: {
        physicalCardId: physicalCardId,
        siteId: guard.siteId,
        status: 'ON_SITE'
      },
      include: {
        worker: {
          include: {
            distributor: true,
            site: true
          }
        },
        site: true,
        registrar: true
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!entryRecord) {
      throw new NotFoundException('未找到该实体卡对应的有效访客记录');
    }

    // 获取工人的当前借用物品（未归还的）
    const currentBorrowedItems = await this.prisma.itemBorrowRecord.findMany({
      where: {
        workerId: entryRecord.worker.id,
        status: 'BORROWED' // 只获取未归还的物品
      },
      include: {
        item: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        borrowDate: 'desc'
      }
    });

    return {
      worker: entryRecord.worker,
      entryRecord: entryRecord,
      currentBorrowedItems: currentBorrowedItems
    };
  }

  // 获取门卫所在工地的访客记录
  async getGuardSiteVisitorRecords(
    user: CurrentUser, 
    startDate?: string, 
    endDate?: string, 
    status?: string,
    checkOutStartDate?: string,
    checkOutEndDate?: string,
    todayRelevant?: boolean
  ) {
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以访问访客记录');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 定义筛选条件接口
    interface WhereClause {
      siteId: string;
      createdAt?: { gte?: Date; lt?: Date };
      checkOutTime?: { gte?: Date; lt?: Date };
      status?: string;
    }
    
    // 基础条件 - 门卫所在工地
    const baseWhere: WhereClause = {
      siteId: guard.siteId
    };
    
    // 使用Prisma的OR查询来实现复杂条件
    let whereConditions = [];
    
    // 如果需要获取"今日相关"记录
    if (todayRelevant) {
      // 获取今天的日期范围
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      
      // 构建三个OR条件
      // 1. 今日入场的记录
      const todayEnteredCondition = {
        ...baseWhere,
        checkInTime: {
          gte: todayStart,
          lte: todayEnd
        }
      };
      
      // 2. 今日离场的记录
      const todayLeftCondition = {
        ...baseWhere,
        checkOutTime: {
          gte: todayStart,
          lte: todayEnd
        }
      };
      
      // 3. 所有未离场的记录
      const allOnSiteCondition = {
        ...baseWhere,
        status: 'ON_SITE'
      };
      
      // 合并条件
      whereConditions = [todayEnteredCondition, todayLeftCondition, allOnSiteCondition];
    } else {
      // 常规筛选逻辑
      
      // 添加入场日期筛选（记录创建时间）
      let createdAtFilter: any = undefined;
      if (startDate || endDate) {
        createdAtFilter = {};
        if (startDate) {
          createdAtFilter.gte = new Date(startDate);
        }
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setDate(endDateObj.getDate() + 1); // 包含结束日期当天
          createdAtFilter.lt = endDateObj;
        }
      }
      
      // 添加离场日期筛选
      let checkOutTimeFilter: any = undefined;
      if (checkOutStartDate || checkOutEndDate) {
        checkOutTimeFilter = {};
        if (checkOutStartDate) {
          checkOutTimeFilter.gte = new Date(checkOutStartDate);
        }
        if (checkOutEndDate) {
          const checkOutEndDateObj = new Date(checkOutEndDate);
          checkOutEndDateObj.setDate(checkOutEndDateObj.getDate() + 1); // 包含结束日期当天
          checkOutTimeFilter.lt = checkOutEndDateObj;
        }
      }
      
      // 创建最终的查询条件
      const whereClause: Record<string, any> = {
        siteId: guard.siteId
      };
      
      if (createdAtFilter) {
        whereClause.createdAt = createdAtFilter;
      }
      
      if (checkOutTimeFilter) {
        whereClause.checkOutTime = checkOutTimeFilter;
      }
      
      // 添加状态筛选
      if (status) {
        whereClause.status = status.toUpperCase();
      }
      
      whereConditions = [whereClause];
    }

    const records = await this.prisma.visitorRecord.findMany({
      where: {
        OR: whereConditions
      },
      include: {
        worker: {
          include: {
            distributor: true
          }
        },
        site: true,
        registrar: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return records;
  }

  // 创建访客记录（入场登记）
  async createVisitorRecord(user: CurrentUser, recordData: any) {
    // // console.log('创建访客记录，接收到的数据:', JSON.stringify(recordData, null, 2));
    
    if (user.role !== 'GUARD') {
      throw new ForbiddenException('只有门卫可以创建访客记录');
    }

    const guard = await this.prisma.guard.findUnique({
      where: { userId: user.id }
    });

    if (!guard) {
      throw new NotFoundException('门卫信息不存在');
    }

    // 验证工人是否存在且属于当前工地
    const worker = await this.prisma.worker.findFirst({
      where: { 
        workerId: recordData.workerId,
        siteId: guard.siteId
      }
    });

    if (!worker) {
      throw new NotFoundException('工人不存在或不属于当前工地');
    }

    // 检查工人是否已经在场
    const existingRecord = await this.prisma.visitorRecord.findFirst({
      where: {
        workerId: worker.id,
        status: 'ON_SITE'
      }
    });

    if (existingRecord) {
      throw new BadRequestException('该工人已经在场，无法重复登记');
    }

    // // console.log('工人原始电话号码:', worker.phone);
    // // console.log('传入的电话号码:', recordData.phone);
    
    // 创建访客记录
    const visitorRecord = await this.prisma.visitorRecord.create({
      data: {
        workerId: worker.id,
        siteId: guard.siteId,
        checkInTime: new Date(),
        status: 'ON_SITE',
        idType: recordData.idType || 'ID_CARD',
        idNumber: recordData.idNumber || worker.idNumber,
        physicalCardId: recordData.physicalCardId,
        registrarId: guard.id,
        phone: recordData.phone || worker.phone, // 使用传入的电话号码或默认使用工人的电话号码
        notes: recordData.notes
      },
      include: {
        worker: {
          include: {
            distributor: true,
            site: true
          }
        },
        site: true,
        registrar: true
      }
    });

    // // console.log('创建的访客记录:', JSON.stringify({
    //   id: visitorRecord.id,
    //   workerId: visitorRecord.workerId,
    //   phone: visitorRecord.phone,
    //   workerPhone: visitorRecord.worker?.phone
    // }, null, 2));
    
    return visitorRecord;
  }
}
