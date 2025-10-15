import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class SendInviteLinkDto {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  phoneNumbers: string[];

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  distributorId?: string;

  @IsOptional()
  @IsString()
  siteId?: string;
}
