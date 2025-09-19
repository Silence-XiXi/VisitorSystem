import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { GetCurrentUser as CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createConfigDto: CreateConfigDto, @CurrentUser() user) {
    return this.systemConfigService.create(createConfigDto, user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.systemConfigService.findAll();
  }

  @Get(':key')
  @Roles(UserRole.ADMIN)
  findOne(@Param('key') key: string, @Query('decrypt') decrypt: boolean) {
    return this.systemConfigService.findByKey(key, decrypt);
  }

  @Patch(':key')
  @Roles(UserRole.ADMIN)
  update(
    @Param('key') key: string,
    @Body() updateConfigDto: UpdateConfigDto,
    @CurrentUser() user,
  ) {
    return this.systemConfigService.update(key, updateConfigDto, user.id);
  }

  @Delete(':key')
  @Roles(UserRole.ADMIN)
  remove(@Param('key') key: string) {
    return this.systemConfigService.remove(key);
  }
}
