import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator'
import { VisitorStatus } from '@prisma/client'

export class CreateVisitorRecordDto {
  @IsString()
  workerId: string

  @IsString()
  siteId: string

  @IsOptional()
  @IsDateString()
  checkInTime?: string

  @IsOptional()
  @IsDateString()
  checkOutTime?: string

  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus

  @IsString()
  idType: string

  @IsString()
  idNumber: string

  @IsOptional()
  @IsString()
  physicalCardId?: string

  @IsOptional()
  @IsString()
  registrarId?: string

  @IsOptional()
  @IsString()
  notes?: string
}
