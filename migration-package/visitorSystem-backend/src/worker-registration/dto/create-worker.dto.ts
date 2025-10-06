import { IsString, IsOptional, IsIn, IsEmail, IsDateString, IsMobilePhone } from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @IsString()
  @IsIn(['ID_CARD', 'PASSPORT', 'DRIVER_LICENSE', 'OTHER'])
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'OTHER';

  @IsString()
  idNumber: string;

  @IsString()
  phone: string;

  @IsString()
  distributorId: string;

  @IsString()
  siteId: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  workerId?: string;
}
