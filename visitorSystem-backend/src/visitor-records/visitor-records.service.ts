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
  }) {
    const where: any = {}

    if (filters?.workerId) {
      where.workerId = filters.workerId
    }

    if (filters?.siteId) {
      where.siteId = filters.siteId
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.startDate || filters?.endDate) {
      where.checkInTime = {}
      if (filters.startDate) {
        // 创建本地时间的开始日期（00:00:00）
        const startDate = new Date(filters.startDate)
        startDate.setHours(0, 0, 0, 0)
        where.checkInTime.gte = startDate
      }
      if (filters.endDate) {
        // 创建本地时间的结束日期（23:59:59）
        const endDate = new Date(filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        where.checkInTime.lte = endDate
      }
    }

    return this.prisma.visitorRecord.findMany({
      where,
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
