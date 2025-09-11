import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(RedisService) private redisService: RedisService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        distributor: true,
        guard: true,
      },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户已被禁用');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);
    const userInfo = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      distributor: user.distributor,
      guard: user.guard,
    };

    // 将用户会话信息存储到Redis
    await this.redisService.setUserSession(user.id, {
      ...userInfo,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    });

    return {
      access_token,
      user: userInfo,
    };
  }

  async logout(userId: string) {
    // 从Redis中删除用户会话
    await this.redisService.deleteUserSession(userId);
    return { message: '登出成功' };
  }

  async getProfile(userId: string) {
    // 先从Redis缓存中获取用户信息
    const cachedUser = await this.redisService.getUserSession(userId);
    if (cachedUser) {
      // 更新最后活动时间
      await this.redisService.setUserSession(userId, {
        ...cachedUser,
        lastActivity: new Date().toISOString(),
      });
      return cachedUser;
    }

    // 如果缓存中没有，从数据库获取
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        distributor: true,
        guard: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const userInfo = {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      distributor: user.distributor,
      guard: user.guard,
      lastActivity: new Date().toISOString(),
    };

    // 将用户信息存储到Redis缓存
    await this.redisService.setUserSession(userId, userInfo);

    return userInfo;
  }

  async createUser(userData: {
    username: string;
    password: string;
    role: string;
  }) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    return this.prisma.user.create({
      data: {
        username: userData.username,
        password: hashedPassword,
        role: userData.role as any,
      },
    });
  }
}
