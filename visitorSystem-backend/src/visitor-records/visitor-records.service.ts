import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVisitorRecordDto } from './dto/create-visitor-record.dto'
import { UpdateVisitorRecordDto } from './dto/update-visitor-record.dto'
import { VisitorStatus } from '@prisma/client'

@Injectable()
export class VisitorRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(createVisitorRecordDto: CreateVisitorRecordDto) {
    // 验证工人是否存在
    const worker = await this.prisma.worker.findUnique({
      where: { id: createVisitorRecordDto.workerId },
      include: { site: true, distributor: true }
    })

    if (!worker) {
      throw new NotFoundException('工人不存在')
    }

    // 验证工地是否存在
    const site = await this.prisma.site.findUnique({
      where: { id: createVisitorRecordDto.siteId }
    })

    if (!site) {
      throw new NotFoundException('工地不存在')
    }

    // 验证登记人是否存在（如果提供）
    if (createVisitorRecordDto.registrarId) {
      const registrar = await this.prisma.guard.findUnique({
        where: { id: createVisitorRecordDto.registrarId }
      })

      if (!registrar) {
        throw new NotFoundException('登记人不存在')
      }
    }

    return this.prisma.visitorRecord.create({
      data: {
        ...createVisitorRecordDto,
        checkInTime: createVisitorRecordDto.checkInTime ? new Date(createVisitorRecordDto.checkInTime) : null,
        checkOutTime: createVisitorRecordDto.checkOutTime ? new Date(createVisitorRecordDto.checkOutTime) : null,
        status: createVisitorRecordDto.status || VisitorStatus.ON_SITE
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
    })
  }

  async findAll(filters?: {
    workerId?: string
    siteId?: string
    status?: VisitorStatus
    startDate?: string
    endDate?: string
    checkOutStartDate?: string
    checkOutEndDate?: string
    todayRelevant?: boolean
  }) {
    // 使用Prisma的OR查询来实现复杂条件
    let whereConditions = []
    
    // 基础过滤条件
    const baseWhere: any = {}
    
    // 工人ID和工地ID筛选
    if (filters?.workerId) {
      baseWhere.workerId = filters.workerId
    }
    
    if (filters?.siteId) {
      baseWhere.siteId = filters.siteId
    }
    
    // 处理today相关的特殊筛选
    if (filters?.todayRelevant) {
      // 获取今天的日期范围
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      
      // 构建三个OR条件
      // 1. 今日入场的记录
      const todayEnteredCondition = {
        ...baseWhere,
        checkInTime: {
          gte: todayStart,
          lte: todayEnd
        }
      }
      
      // 2. 今日离场的记录
      const todayLeftCondition = {
        ...baseWhere,
        checkOutTime: {
          gte: todayStart,
          lte: todayEnd
        }
      }
      
      // 3. 所有未离场的记录
      const allOnSiteCondition = {
        ...baseWhere,
        status: VisitorStatus.ON_SITE
      }
      
      // 合并条件
      whereConditions = [todayEnteredCondition, todayLeftCondition, allOnSiteCondition]
      
    } else {
      // 常规筛选逻辑
      const regularWhere = { ...baseWhere }
      
      // 状态筛选
      if (filters?.status) {
        regularWhere.status = filters.status
      }
      
      // 入场时间筛选
      if (filters?.startDate || filters?.endDate) {
        regularWhere.checkInTime = {}
        if (filters.startDate) {
          // 创建本地时间的开始日期（00:00:00）
          const startDate = new Date(filters.startDate)
          startDate.setHours(0, 0, 0, 0)
          regularWhere.checkInTime.gte = startDate
        }
        if (filters.endDate) {
          // 创建本地时间的结束日期（23:59:59）
          const endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
          regularWhere.checkInTime.lte = endDate
        }
      }
      
      // 离场时间筛选
      if (filters?.checkOutStartDate || filters?.checkOutEndDate) {
        regularWhere.checkOutTime = {}
        if (filters.checkOutStartDate) {
          const startDate = new Date(filters.checkOutStartDate)
          startDate.setHours(0, 0, 0, 0)
          regularWhere.checkOutTime.gte = startDate
        }
        if (filters.checkOutEndDate) {
          const endDate = new Date(filters.checkOutEndDate)
          endDate.setHours(23, 59, 59, 999)
          regularWhere.checkOutTime.lte = endDate
        }
      }
      
      whereConditions = [regularWhere]
    }

    return this.prisma.visitorRecord.findMany({
      where: {
        OR: whereConditions
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
    })
  }

  async findOne(id: string) {
    const visitorRecord = await this.prisma.visitorRecord.findUnique({
      where: { id },
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
    })

    if (!visitorRecord) {
      throw new NotFoundException('访客记录不存在')
    }

    return visitorRecord
  }

  async findByWorkerId(workerId: string) {
    return this.prisma.visitorRecord.findMany({
      where: { workerId },
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
    })
  }

  async update(id: string, updateVisitorRecordDto: UpdateVisitorRecordDto) {
    const existingRecord = await this.prisma.visitorRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      throw new NotFoundException('访客记录不存在')
    }

    // 验证工人是否存在（如果更新工人ID）
    if (updateVisitorRecordDto.workerId) {
      const worker = await this.prisma.worker.findUnique({
        where: { id: updateVisitorRecordDto.workerId }
      })

      if (!worker) {
        throw new NotFoundException('工人不存在')
      }
    }

    // 验证工地是否存在（如果更新工地ID）
    if (updateVisitorRecordDto.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: updateVisitorRecordDto.siteId }
      })

      if (!site) {
        throw new NotFoundException('工地不存在')
      }
    }

    // 验证登记人是否存在（如果更新登记人ID）
    if (updateVisitorRecordDto.registrarId) {
      const registrar = await this.prisma.guard.findUnique({
        where: { id: updateVisitorRecordDto.registrarId }
      })

      if (!registrar) {
        throw new NotFoundException('登记人不存在')
      }
    }

    return this.prisma.visitorRecord.update({
      where: { id },
      data: {
        ...updateVisitorRecordDto,
        checkInTime: updateVisitorRecordDto.checkInTime ? new Date(updateVisitorRecordDto.checkInTime) : undefined,
        checkOutTime: updateVisitorRecordDto.checkOutTime ? new Date(updateVisitorRecordDto.checkOutTime) : undefined
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
    })
  }

  async remove(id: string) {
    const existingRecord = await this.prisma.visitorRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      throw new NotFoundException('访客记录不存在')
    }

    return this.prisma.visitorRecord.delete({
      where: { id }
    })
  }

  async checkOut(id: string, checkOutTime?: string) {
    const existingRecord = await this.prisma.visitorRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      throw new NotFoundException('访客记录不存在')
    }

    if (existingRecord.status === VisitorStatus.LEFT) {
      throw new BadRequestException('该访客已经离场')
    }

    return this.prisma.visitorRecord.update({
      where: { id },
      data: {
        checkOutTime: checkOutTime ? new Date(checkOutTime) : new Date(),
        status: VisitorStatus.LEFT
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
    })
  }
}
