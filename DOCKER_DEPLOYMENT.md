# 访客管理系统 Docker 蓝绿部署指南

## 项目结构

```
project-root/
├── visitorSystem-frontend/    # 前端源代码
├── visitorSystem-backend/     # 后端源代码
├── docker/                    # Docker配置目录
│   ├── nginx/                 # Nginx配置
│   │   ├── nginx.blue.conf    # 指向蓝环境的配置
│   │   ├── nginx.green.conf   # 指向绿环境的配置
│   │   ├── nginx.conf         # 主配置文件
│   │   └── ssl/               # HTTPS证书（可选）
│   ├── frontend/              # 前端Dockerfile
│   │   └── Dockerfile
│   └── backend/               # 后端Dockerfile
│       └── Dockerfile
├── docker-compose.base.yml    # 基础服务配置（数据库、Redis等）
├── docker-compose.blue.yml    # 蓝环境应用配置
├── docker-compose.green.yml   # 绿环境应用配置
├── docker-compose.nginx.yml   # Nginx服务配置
├── deploy.sh                  # 部署脚本（自动化切换）
└── env.example                # 环境变量示例
```

## 蓝绿部署原理

蓝绿部署是一种零停机部署策略：

1. **蓝环境**：当前生产环境
2. **绿环境**：新版本部署环境
3. **Nginx**：作为负载均衡器，控制流量路由
4. **切换**：通过修改Nginx配置实现流量切换

## 快速开始

### 1. 环境准备

```bash
# 复制环境变量文件
cp env.example .env

# 编辑环境变量
vim .env
```

### 2. 首次部署

```bash
# 部署蓝环境
./deploy.sh blue
```

### 3. 部署新版本

```bash
# 部署新版本到绿环境
./deploy.sh green

# 切换流量到绿环境
./deploy.sh switch green
```

### 4. 回滚

```bash
# 切换回蓝环境
./deploy.sh switch blue
```

## 部署命令详解

### 基础命令

```bash
# 部署蓝环境
./deploy.sh blue

# 部署绿环境
./deploy.sh green

# 切换到蓝环境
./deploy.sh switch blue

# 切换到绿环境
./deploy.sh switch green

# 查看系统状态
./deploy.sh status

# 清理所有服务
./deploy.sh cleanup
```

### 部署流程

1. **首次部署**：
   ```bash
   ./deploy.sh blue
   ```

2. **部署新版本**：
   ```bash
   # 部署到绿环境
   ./deploy.sh green
   
   # 测试绿环境
   curl http://localhost:3004/health
   
   # 切换流量
   ./deploy.sh switch green
   ```

3. **回滚**：
   ```bash
   ./deploy.sh switch blue
   ```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80 | 主入口 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Adminer | 8080 | 数据库管理 |
| 蓝环境后端 | 3001 | 蓝环境API |
| 蓝环境前端 | 3002 | 蓝环境前端 |
| 绿环境后端 | 3003 | 绿环境API |
| 绿环境前端 | 3004 | 绿环境前端 |

## 环境变量配置

### 必需配置

```bash
# 数据库
POSTGRES_PASSWORD=your-db-password

# Redis
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret

# 邮件
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email
EMAIL_PASSWORD=your-password
```

### 可选配置

```bash
# WhatsApp
WHATSAPP_API_KEY=your-api-key
WHATSAPP_PHONE_NUMBER=+85212345678

# 应用
NODE_ENV=production
PORT=3000
```

## 健康检查

系统包含以下健康检查：

- **数据库**：PostgreSQL 连接检查
- **Redis**：Redis 连接检查
- **后端服务**：HTTP 健康检查端点
- **前端服务**：Nginx 健康检查
- **Nginx**：负载均衡器健康检查

## 监控和日志

### 查看服务状态

```bash
# 查看所有服务状态
./deploy.sh status

# 查看特定服务日志
docker-compose -f docker-compose.blue.yml logs backend-blue
docker-compose -f docker-compose.green.yml logs backend-green
```

### 查看日志

```bash
# 查看 Nginx 日志
docker logs visitor-nginx

# 查看后端日志
docker logs visitor-backend-blue
docker logs visitor-backend-green

# 查看数据库日志
docker logs visitor-postgres
```

## 故障排除

### 常见问题

1. **端口冲突**：
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   
   # 停止冲突服务
   sudo systemctl stop nginx
   ```

2. **服务启动失败**：
   ```bash
   # 查看详细日志
   docker-compose -f docker-compose.blue.yml logs
   
   # 重新构建镜像
   docker-compose -f docker-compose.blue.yml up -d --build
   ```

3. **数据库连接失败**：
   ```bash
   # 检查数据库状态
   docker-compose -f docker-compose.base.yml ps postgres
   
   # 重启数据库
   docker-compose -f docker-compose.base.yml restart postgres
   ```

### 清理和重置

```bash
# 清理所有服务
./deploy.sh cleanup

# 清理 Docker 资源
docker system prune -a

# 重新部署
./deploy.sh blue
```

## 生产环境注意事项

1. **安全性**：
   - 修改默认密码
   - 使用强JWT密钥
   - 配置HTTPS证书

2. **性能**：
   - 调整Docker资源限制
   - 配置Redis持久化
   - 优化数据库连接池

3. **监控**：
   - 配置日志收集
   - 设置监控告警
   - 定期备份数据

4. **备份**：
   ```bash
   # 备份数据库
   docker exec visitor-postgres pg_dump -U postgres visitor_system > backup.sql
   
   # 备份Redis
   docker exec visitor-redis redis-cli --rdb /data/dump.rdb
   ```

## 扩展功能

### SSL/HTTPS 配置

1. 将证书文件放入 `docker/nginx/ssl/` 目录
2. 修改 Nginx 配置启用 HTTPS
3. 更新环境变量中的API地址

### 多实例部署

修改 Docker Compose 文件中的 `replicas` 配置：

```yaml
services:
  backend-blue:
    deploy:
      replicas: 3
```

### 负载均衡优化

在 Nginx 配置中添加负载均衡策略：

```nginx
upstream backend_blue {
    server backend-blue-1:3000 weight=3;
    server backend-blue-2:3000 weight=2;
    server backend-blue-3:3000 weight=1;
}
```
