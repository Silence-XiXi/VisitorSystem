# 访客管理系统 - 容器启动快捷指令

## 🚀 一键启动脚本

### 1. 完整启动（推荐）
```bash
# 启动所有六个容器
./start-containers.sh
```

### 2. 停止所有容器
```bash
# 停止所有容器
./stop-containers.sh

# 停止并删除所有容器
./stop-containers.sh --cleanup
```

### 3. 重启系统
```bash
# 重启所有容器
./restart-containers.sh
```

## 📋 手动启动指令

### 基础服务（3个容器）

#### 1. PostgreSQL 数据库
```bash
docker run -d \
  --name visitor-postgres \
  --network visitorsystem_visitor-network \
  -p 5432:5432 \
  -e POSTGRES_DB=visitor_system \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres123 \
  -v visitor_postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine
```

#### 2. Redis 缓存
```bash
docker run -d \
  --name visitor-redis \
  --network visitorsystem_visitor-network \
  -p 6379:6379 \
  -e REDIS_PASSWORD=redis123 \
  redis:7-alpine redis-server --requirepass redis123
```

#### 3. Adminer 数据库管理
```bash
docker run -d \
  --name visitor-adminer \
  --network visitorsystem_visitor-network \
  -p 8080:8080 \
  adminer:latest
```

### 应用服务（3个容器）

#### 4. 后端 API 服务
```bash
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
```

#### 5. 前端服务
```bash
docker run -d \
  --name visitor-frontend-blue \
  --network visitorsystem_visitor-network \
  -p 3002:80 \
  visitor-frontend-blue
```

#### 6. Nginx 负载均衡器
```bash
docker run -d \
  --name visitor-nginx \
  --network visitorsystem_visitor-network \
  -p 80:80 \
  -v $(pwd)/docker/nginx/nginx.blue.conf:/etc/nginx/nginx.conf \
  nginx:alpine
```

## 🔧 管理命令

### 查看容器状态
```bash
# 查看所有容器
docker ps

# 查看访客系统容器
docker ps | grep visitor

# 查看容器详细信息
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
```

### 查看容器日志
```bash
# 查看特定容器日志
docker logs visitor-backend-blue
docker logs visitor-frontend-blue
docker logs visitor-nginx
docker logs visitor-postgres
docker logs visitor-redis
docker logs visitor-adminer

# 实时查看日志
docker logs -f visitor-backend-blue
```

### 进入容器
```bash
# 进入后端容器
docker exec -it visitor-backend-blue sh

# 进入数据库容器
docker exec -it visitor-postgres psql -U postgres -d visitor_system
```

### 停止单个容器
```bash
# 停止特定容器
docker stop visitor-backend-blue
docker stop visitor-frontend-blue
docker stop visitor-nginx

# 重启特定容器
docker restart visitor-backend-blue
```

## 🌐 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **主系统** | http://localhost | 访客管理系统前端 |
| **数据库管理** | http://localhost:8080 | Adminer 数据库管理界面 |
| **前端直接访问** | http://localhost:3002 | 前端服务直接访问 |
| **后端API** | http://localhost:3001/api | 后端API服务 |
| **健康检查** | http://localhost/health | 系统健康检查 |

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

### 容器启动失败
```bash
# 检查容器日志
docker logs <容器名>

# 检查网络
docker network ls
docker network inspect visitorsystem_visitor-network

# 重新创建网络
docker network rm visitorsystem_visitor-network
docker network create visitorsystem_visitor-network
```

### 端口冲突
```bash
# 检查端口占用
lsof -i :80
lsof -i :3001
lsof -i :3002
lsof -i :5432
lsof -i :6379
lsof -i :8080

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 镜像构建失败
```bash
# 清理Docker缓存
docker system prune -a

# 重新构建镜像
docker build -f docker/backend/Dockerfile -t visitor-backend-blue .
docker build -f docker/frontend/Dockerfile -t visitor-frontend-blue .
```

## 📝 常用组合命令

### 快速重启后端
```bash
docker stop visitor-backend-blue && docker rm visitor-backend-blue
# 然后重新运行后端启动命令
```

### 快速重启前端
```bash
docker stop visitor-frontend-blue && docker rm visitor-frontend-blue
# 然后重新运行前端启动命令
```

### 查看所有容器资源使用
```bash
docker stats
```

### 清理未使用的资源
```bash
docker system prune -a
```

## 🎯 最佳实践

1. **使用脚本启动**: 推荐使用 `./start-containers.sh` 一键启动
2. **定期备份**: 数据库数据存储在 `visitor_postgres_data` 卷中
3. **监控日志**: 定期检查容器日志，特别是后端服务
4. **网络隔离**: 所有容器都在 `visitorsystem_visitor-network` 网络中
5. **环境变量**: 生产环境请修改敏感的环境变量

---

**注意**: 首次运行需要构建镜像，可能需要几分钟时间。后续启动会更快。
