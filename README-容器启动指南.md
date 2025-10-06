# 🚀 访客管理系统 - 容器启动指南

## 📋 六个容器概览

| 序号 | 容器名称 | 服务类型 | 端口 | 说明 |
|------|----------|----------|------|------|
| 1 | `visitor-postgres` | 数据库 | 5432 | PostgreSQL 主数据库 |
| 2 | `visitor-redis` | 缓存 | 6379 | Redis 缓存服务 |
| 3 | `visitor-adminer` | 管理工具 | 8080 | 数据库管理界面 |
| 4 | `visitor-backend-blue` | 后端API | 3001 | NestJS 后端服务 |
| 5 | `visitor-frontend-blue` | 前端 | 3002 | React 前端服务 |
| 6 | `visitor-nginx` | 负载均衡 | 80 | Nginx 反向代理 |

## 🎯 一键启动（推荐）

### 最简单的方式
```bash
# 启动所有六个容器
make start

# 或者直接使用脚本
./start-containers.sh
```

### 停止系统
```bash
# 停止所有容器
make stop

# 或者
./stop-containers.sh
```

### 重启系统
```bash
# 重启所有容器
make restart

# 或者
./restart-containers.sh
```

## 🔧 分步启动指令

### 第一步：创建网络
```bash
docker network create visitorsystem_visitor-network
```

### 第二步：启动基础服务（3个容器）
```bash
# 1. PostgreSQL 数据库
docker run -d \
  --name visitor-postgres \
  --network visitorsystem_visitor-network \
  -p 5432:5432 \
  -e POSTGRES_DB=visitor_system \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -v visitor_postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# 2. Redis 缓存
docker run -d \
  --name visitor-redis \
  --network visitorsystem_visitor-network \
  -p 6379:6379 \
  -e REDIS_PASSWORD=redis123 \
  redis:7-alpine redis-server --requirepass redis123

# 3. Adminer 数据库管理
docker run -d \
  --name visitor-adminer \
  --network visitorsystem_visitor-network \
  -p 8080:8080 \
  adminer:latest
```

### 第三步：构建应用镜像
```bash
# 构建前端镜像
docker build -f docker/frontend/Dockerfile -t visitor-frontend-blue .

# 构建后端镜像
docker build -f docker/backend/Dockerfile -t visitor-backend-blue .
```

### 第四步：启动应用服务（3个容器）
```bash
# 4. 后端 API 服务
docker run -d \
  --name visitor-backend-blue \
  --network visitorsystem_visitor-network \
  -p 3001:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/visitor_system \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=redis123 \
  -e REDIS_URL=redis://:redis123@redis:6379 \
  -e JWT_SECRET=19391a718294795aa6a61a3e9eb837b9644888c0c35ffbe70cea1a57fc097c16 \
  -e EMAIL_HOST=mail.wisesystemtech.com \
  -e EMAIL_PORT=587 \
  -e EMAIL_USER=erpsystem@wisesystemtech.com \
  -e EMAIL_PASSWORD=jv7VSByIRIl2lhM5 \
  -e WHATSAPP_API_KEY=1e673379256fe1b0385c97d8120fbb30 \
  -e WHATSAPP_PHONE_NUMBER=+85261606103 \
  visitor-backend-blue

# 5. 前端服务
docker run -d \
  --name visitor-frontend-blue \
  --network visitorsystem_visitor-network \
  -p 3002:80 \
  visitor-frontend-blue

# 6. Nginx 负载均衡器
docker run -d \
  --name visitor-nginx \
  --network visitorsystem_visitor-network \
  -p 80:80 \
  -v $(pwd)/docker/nginx/nginx.blue.conf:/etc/nginx/nginx.conf \
  nginx:alpine
```

## 🌐 访问地址

启动完成后，您可以通过以下地址访问系统：

| 服务 | 地址 | 说明 |
|------|------|------|
| **主系统** | http://localhost | 访客管理系统（推荐） |
| **数据库管理** | http://localhost:8080 | Adminer 管理界面 |
| **前端直接** | http://localhost:3002 | 前端服务直接访问 |
| **后端API** | http://localhost:3001/api | 后端API文档 |
| **健康检查** | http://localhost/health | 系统健康状态 |

## 📊 管理命令

### 查看容器状态
```bash
# 查看所有容器
docker ps

# 查看访客系统容器
docker ps | grep visitor

# 使用 Makefile
make status
```

### 查看日志
```bash
# 查看特定容器日志
docker logs visitor-backend-blue
docker logs visitor-frontend-blue
docker logs visitor-nginx

# 实时查看日志
docker logs -f visitor-backend-blue

# 使用 Makefile
make logs
```

### 进入容器
```bash
# 进入后端容器
docker exec -it visitor-backend-blue sh

# 进入数据库容器
docker exec -it visitor-postgres psql -U postgres -d visitor_system
```

## 🔑 数据库连接信息

### PostgreSQL
- **主机**: localhost
- **端口**: 5432
- **数据库**: visitor_system
- **用户名**: postgres
- **密码**: postgres123

### Redis
- **主机**: localhost
- **端口**: 6379
- **密码**: redis123

## 🚨 故障排除

### 常见问题

1. **容器启动失败**
   ```bash
   # 检查日志
   docker logs <容器名>
   
   # 检查网络
   docker network ls
   ```

2. **端口冲突**
   ```bash
   # 检查端口占用
   lsof -i :80
   lsof -i :3001
   ```

3. **镜像构建失败**
   ```bash
   # 清理缓存
   docker system prune -a
   
   # 重新构建
   make build
   ```

### 完全重置
```bash
# 停止并删除所有容器
./stop-containers.sh --cleanup

# 删除网络
docker network rm visitorsystem_visitor-network

# 重新启动
make start
```

## 🎯 最佳实践

1. **首次启动**: 使用 `make start` 一键启动
2. **日常管理**: 使用 `make status` 查看状态
3. **问题排查**: 使用 `make logs` 查看日志
4. **定期备份**: 数据库数据在 `visitor_postgres_data` 卷中
5. **环境隔离**: 所有容器在独立网络中运行

## 📝 快速参考

```bash
# 🚀 启动系统
make start

# 📊 查看状态
make status

# 📋 查看日志
make logs

# 🛑 停止系统
make stop

# 🔄 重启系统
make restart

# 🧹 清理系统
make cleanup
```

---

**注意**: 首次启动需要构建镜像，可能需要几分钟时间。后续启动会更快。
