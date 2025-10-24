import { IsArray, IsString, IsOptional, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class WorkerQRCodeDataDto {
  @ApiProperty({ description: '工人WhatsApp号码' })
  @IsString()
  @IsNotEmpty()
  workerWhatsApp: string;

  @ApiProperty({ description: '工人姓名' })
  @IsString()
  @IsNotEmpty()
  workerName: string;

  @ApiProperty({ description: '工人ID' })
  @IsString()
  @IsNotEmpty()
  workerId: string;

  @ApiProperty({ description: '二维码数据URL' })
  @IsString()
  @IsNotEmpty()
  qrCodeDataUrl: string;
}

export class AsyncBatchSendQRCodeDto {
  @ApiProperty({ 
    description: '工人二维码数据数组',
    type: [WorkerQRCodeDataDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerQRCodeDataDto)
  workers: WorkerQRCodeDataDto[];

  @ApiProperty({ 
    description: '语言设置',
    default: 'zh-CN',
    required: false
  })
  @IsOptional()
  @IsString()
  language?: string = 'zh-CN';
}
