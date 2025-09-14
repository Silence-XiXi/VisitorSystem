import { PartialType } from '@nestjs/mapped-types'
import { CreateVisitorRecordDto } from './create-visitor-record.dto'

export class UpdateVisitorRecordDto extends PartialType(CreateVisitorRecordDto) {}
