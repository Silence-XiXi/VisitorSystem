import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerDto } from './dto/create-worker.dto';
import { generateWorkerId } from '../utils/id-generator';

@Injectable()
export class WorkerRegistrationService {
  constructor(private prisma: PrismaService) {}

  async getRegistrationInfo(distributorId: string, siteId: string) {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        name: true,
        contactName: true,
      },
    });

    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: {
        id: true,
        name: true,
        address: true,
        code: true,
      },
    });

    // 验证分判商与工地是否关联
    if (distributor && site) {
      const distributorSite = await this.prisma.siteDistributor.findFirst({
        where: {
          distributorId,
          siteId,
        },
      });

      if (!distributorSite) {
        throw new BadRequestException('该分判商与工地不存在关联关系');
      }
    }

    return { distributor, site };
  }

  // 检查身份证号码是否已存在
  async checkIdNumberExists(idNumber: string): Promise<boolean> {
    const existingWorker = await this.prisma.worker.findFirst({
      where: {
        idNumber: idNumber,
      },
    });
    
    return !!existingWorker;
  }
  
  async registerWorker(createWorkerDto: CreateWorkerDto) {
    // 验证分判商和工地是否存在
    const distributorExists = await this.prisma.distributor.findUnique({
      where: { id: createWorkerDto.distributorId },
    });

    if (!distributorExists) {
      throw new NotFoundException(`分判商不存在: ${createWorkerDto.distributorId}`);
    }

    const siteExists = await this.prisma.site.findUnique({
      where: { id: createWorkerDto.siteId },
    });

    if (!siteExists) {
      throw new NotFoundException(`工地不存在: ${createWorkerDto.siteId}`);
    }

    // 检查证件号码是否重复
    const idNumberExists = await this.checkIdNumberExists(createWorkerDto.idNumber);

    if (idNumberExists) {
      throw new ConflictException('证件号码已存在，请检查您的输入');
    }

    // 检查电话是否重复
    const existingPhone = await this.prisma.worker.findFirst({
      where: {
        phone: createWorkerDto.phone,
      },
    });

    if (existingPhone) {
      throw new ConflictException('手机号已存在，请检查您的输入');
    }

    // 生成工人编号
    const workerId = createWorkerDto.workerId || await generateWorkerId();

    // 创建工人记录
    const worker = await this.prisma.worker.create({
      data: {
        workerId,
        name: createWorkerDto.name,
        gender: createWorkerDto.gender,
        idType: createWorkerDto.idType,
        idNumber: createWorkerDto.idNumber,
        phone: createWorkerDto.phone,
        region: createWorkerDto.region || '中国大陆',
        distributorId: createWorkerDto.distributorId,
        siteId: createWorkerDto.siteId,
        birthDate: createWorkerDto.birthDate ? new Date(createWorkerDto.birthDate) : null,
        email: createWorkerDto.email || null,
        whatsapp: createWorkerDto.whatsapp || null,
        status: 'ACTIVE',
      },
    });

    return {
      success: true,
      workerId: worker.workerId,
      name: worker.name,
      message: '工人信息注册成功'
    };
  }
}
