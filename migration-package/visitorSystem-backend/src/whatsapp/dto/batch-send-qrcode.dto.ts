import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WorkerQRCodeDto {
  @IsNotEmpty()
  @IsString()
  workerWhatsApp: string;

  @IsNotEmpty()
  @IsString()
  workerName: string;

  @IsNotEmpty()
  @IsString()
  workerId: string;

  @IsNotEmpty()
  @IsString()
  qrCodeDataUrl: string;
}

export class BatchSendQRCodeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkerQRCodeDto)
  workers: WorkerQRCodeDto[];
  
  @IsOptional()
  @IsString()
  language?: string;
}
