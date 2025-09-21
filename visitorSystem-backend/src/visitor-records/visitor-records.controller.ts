import { Controller, Get, Post, Body, Patch, Put, Param, Delete, Query, UseGuards } from '@nestjs/common'
import { VisitorRecordsService } from './visitor-records.service'
import { CreateVisitorRecordDto } from './dto/create-visitor-record.dto'
import { UpdateVisitorRecordDto } from './dto/update-visitor-record.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '@prisma/client'
import { VisitorStatus } from '@prisma/client'

@Controller('visitor-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitorRecordsController {
  constructor(private readonly visitorRecordsService: VisitorRecordsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  create(@Body() createVisitorRecordDto: CreateVisitorRecordDto) {
    return this.visitorRecordsService.create(createVisitorRecordDto)
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GUARD, UserRole.DISTRIBUTOR)
  findAll(
    @Query('workerId') workerId?: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: VisitorStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('checkOutStartDate') checkOutStartDate?: string,
    @Query('checkOutEndDate') checkOutEndDate?: string,
    @Query('todayRelevant') todayRelevant?: string
  ) {
    return this.visitorRecordsService.findAll({
      workerId,
      siteId,
      status,
      startDate,
      endDate,
      checkOutStartDate,
      checkOutEndDate,
      todayRelevant: todayRelevant === 'true'
    })
  }

  @Get('worker/:workerId')
  @Roles(UserRole.ADMIN, UserRole.GUARD, UserRole.DISTRIBUTOR)
  findByWorkerId(@Param('workerId') workerId: string) {
    return this.visitorRecordsService.findByWorkerId(workerId)
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GUARD, UserRole.DISTRIBUTOR)
  findOne(@Param('id') id: string) {
    return this.visitorRecordsService.findOne(id)
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  update(@Param('id') id: string, @Body() updateVisitorRecordDto: UpdateVisitorRecordDto) {
    return this.visitorRecordsService.update(id, updateVisitorRecordDto)
  }

  @Patch(':id/checkout')
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  checkOut(@Param('id') id: string, @Body('checkOutTime') checkOutTime?: string) {
    return this.visitorRecordsService.checkOut(id, checkOutTime)
  }

  @Put(':id/checkout')
  @Roles(UserRole.ADMIN, UserRole.GUARD)
  checkOutPut(@Param('id') id: string, @Body('checkOutTime') checkOutTime?: string) {
    return this.visitorRecordsService.checkOut(id, checkOutTime)
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.visitorRecordsService.remove(id)
  }
}
