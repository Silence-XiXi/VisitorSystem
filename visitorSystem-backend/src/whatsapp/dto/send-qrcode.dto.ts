import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendQRCodeDto {
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
  
  @IsOptional()
  @IsString()
  language?: string;
}
