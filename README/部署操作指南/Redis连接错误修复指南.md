# 🔧 Redis连接错误修复指南

## ❌ 错误信息

```
Redis连接错误: Error: getaddrinfo EAI_AGAIN redis
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26) {
  errno: -3001,
  code: 'EAI_AGAIN',
  syscall: 'getaddrinfo',
  hostname: 'redis'
}
```

## 🔍 问题分析

后端容器无法解析 Redis 主机名 `redis`。可能原因：

1. ❌ Redis 容器未运行
2. ❌ 容器不在同一个网络中
3. ❌ 环境变量配置错误
4. ❌ Redis 容器名称与配置不匹配

---

## ✅ 解决方案

### 步骤1: 检查 Redis 容器状态

```bash
# 检查所有容器状态
docker ps -a | grep redis

# 如果容器存在但未运行
docker ps -a | grep visitor-redis
```

**期望输出：**
```
visitor-redis   Up 2 hours   0.0.0.0:6379->6379/tcp
```

**如果显示 `Exit` 或 `Created`：**
```bash
# 启动 Redis 容器
docker start visitor-redis

# 等待几秒
sleep 5

# 再次检查
docker ps | grep visitor-redis
```

### 步骤2: 启动 Redis 容器（如果不存在）

```bash
# 检查 Docker 网络
docker network ls | grep visitorsystem

# 如果网络不存在，创建它
docker network create visitorsystem-network

# 启动 Redis 容器
docker run -d \
  --name visitor-redis \
  --network visitorsystem-network \
  -p 6379:6379 \
  -e REDIS_PASSWORD=redis123 \
  -v redis_data:/data \
  redis:7-alpine redis-server --appendonly yes --requirepass redis123
```

### 步骤3: 验证 Redis 连接

```bash
# 测试从宿主机连接（需要密码）
docker exec visitor-redis redis-cli -a redis123 ping

# 预期输出: PONG

# 从网络中的另一个容器测试（模拟后端连接）
docker run --rm --network visitorsystem-network redis:7-alpine redis-cli -h visitor-redis -a redis123 ping

# 预期输出: PONG
```

### 步骤4: 检查后端容器的网络配置

```bash
# 查看后端容器的网络
docker inspect visitor-backend-blue | grep -A 20 "Networks"

# 检查容器是否在正确的网络中
docker network inspect visitorsystem-network | grep visitor-backend-blue
```

### 步骤5: 修复后端容器的网络配置

```bash
# 如果后端容器不在正确网络中，需要重新创建

# 先删除旧容器
docker stop visitor-backend-blue
docker rm visitor-backend-blue

# 重新创建并连接到正确网络（完整命令）
docker run -d \
  --name visitor-backend-blue \
  --network visitorsystem-network \
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

# 等待启动
sleep 10

# 检查日志
docker logs visitor-backend-blue
```

### 步骤6: 验证修复

```bash
# 检查容器状态
docker ps | grep visitor

# 查看后端日志（应该没有 Redis 错误）
docker logs visitor-backend-blue

# 测试健康检查
curl http://localhost:3001/api/health

# 预期输出: {"status":"ok"}
```

---

## 🔍 详细故障排查

### 问题1: Redis 容器名称不匹配

**症状：** 配置中使用 `redis` 但实际容器名为 `visitor-redis`

**解决：**

```bash
# 选项A: 修改环境变量
docker stop visitor-backend-blue
docker start visitor-backend-blue \
  -e REDIS_HOST=visitor-redis

# 选项B: 重新创建 Redis 容器（使用正确的名称）
docker stop visitor-redis
docker rm visitor-redis

docker run -d \
  --name redis \
  --network visitorsystem-network \
  -p 6379:6379 \
  -e REDIS_PASSWORD=redis123 \
  redis:7-alpine redis-server --appendonly yes --requirepass redis123
```

### 问题2: 网络配置问题

```bash
# 检查网络配置
docker network inspect visitorsystem-network

# 输出应该包含所有容器：
# - visitor-postgres
# - visitor-redis
# - visitor-backend-blue
# - visitor-frontend-blue

# 如果容器不在网络中，手动添加到网络：
docker network connect visitorsystem-network visitor-backend-blue
docker network connect visitorsystem-network visitor-redis
```

### 问题3: DNS 解析问题

```bash
# 测试 DNS 解析
docker exec visitor-backend-blue nslookup redis

# 预期输出:
# Server:         127.0.0.11
# Address:        127.0.0.11:53
# Name:   redis
# Address: 172.18.0.x

# 如果无法解析，重启容器
docker restart visitor-backend-blue
docker restart visitor-redis
```

### 问题4: Redis 密码配置错误

```bash
# 测试 Redis 连接（需要正确的密码）
docker exec visitor-redis redis-cli -a redis123 ping

# 如果密码错误，查看当前密码设置
docker inspect visitor-redis | grep -A 5 "Command"

# 如果需要修改密码，重启 Redis 容器
docker restart visitor-redis
```

---

## 🚀 一键修复脚本

创建并运行以下脚本来一键修复：

```bash
# 创建修复脚本
cat > fix-redis-connection.sh << 'EOF'
#!/bin/bash

echo "🔧 修复 Redis 连接问题..."

# 1. 停止后端容器
echo "1. 停止后端容器..."
docker stop visitor-backend-blue 2>/dev/null

# 2. 检查 Redis 容器
echo "2. 检查 Redis 容器..."
if ! docker ps | grep -q visitor-redis; then
    echo "   启动 Redis 容器..."
    docker start visitor-redis 2>/dev/null
    
    if ! docker ps | grep -q visitor-redis; then
        echo "   Redis 容器不存在，创建新容器..."
        docker run -d \
          --name visitor-redis \
          --network visitorsystem-network \
          -p 6379:6379 \
          -v redis_data:/data \
          redis:7-alpine redis-server --appendonly yes --requirepass redis123
    fi
fi

# 3. 等待 Redis 启动
echo "3. 等待 Redis 启动..."
sleep 5

# 4. 测试 Redis 连接
echo "4. 测试 Redis 连接..."
if docker exec visitor-redis redis-cli -a redis123 ping | grep -q PONG; then
    echo "   ✓ Redis 连接正常"
else
    echo "   ✗ Redis 连接失败"
fi

# 5. 检查网络
echo "5. 检查网络配置..."
if ! docker network inspect visitorsystem-network | grep -q visitor-redis; then
    echo "   添加 Redis 到网络..."
    docker network connect visitorsystem-network visitor-redis
fi

# 6. 重启后端容器
echo "6. 重启后端容器..."
docker start visitor-backend-blue

# 7. 等待启动
sleep 10

# 8. 检查日志
echo "8. 检查后端日志..."
docker logs visitor-backend-blue | tail -20

echo ""
echo "✅ 修复完成！"
echo ""
echo "验证命令："
echo "  docker logs visitor-backend-blue"
echo "  curl http://localhost:3001/api/health"
EOF

# 添加执行权限
chmod +x fix-redis-connection.sh

# 执行修复
./fix-redis-connection.sh
```

---

## 📋 完整容器启动顺序

确保按以下顺序启动容器：

```bash
# 1. 启动基础服务
docker start visitor-postgres
docker start visitor-redis

# 等待基础服务启动
sleep 10

# 2. 测试基础服务
docker exec visitor-postgres pg_isready -U postgres
docker exec visitor-redis redis-cli -a redis123 ping

# 3. 启动应用服务
docker start visitor-backend-blue
docker start visitor-frontend-blue

# 4. 等待应用启动
sleep 15

# 5. 检查状态
docker ps
curl http://localhost:3001/api/health
```

---

## ✅ 验证成功的标志

修复成功后，应该看到：

1. ✅ Redis 容器运行中
   ```bash
   docker ps | grep visitor-redis
   # 输出: visitor-redis   Up X minutes
   ```

2. ✅ 后端容器运行中
   ```bash
   docker ps | grep visitor-backend-blue
   # 输出: visitor-backend-blue   Up X minutes
   ```

3. ✅ 后端日志无错误
   ```bash
   docker logs visitor-backend-blue | grep -i redis
   # 应该没有错误信息
   ```

4. ✅ 健康检查通过
   ```bash
   curl http://localhost:3001/api/health
   # 返回: {"status":"ok"}
   ```

---

## 🔄 使用 Docker Compose 重新部署（推荐）

如果手动修复困难，建议使用 Docker Compose 重新部署：

```bash
# 停止所有容器
docker stop visitor-backend-blue visitor-frontend-blue visitor-nginx visitor-postgres visitor-redis visitor-adminer

# 使用 Docker Compose 启动基础服务
docker compose -f docker-compose.base.yml up -d

# 等待基础服务启动
sleep 15

# 启动应用服务
docker compose -f docker-compose.blue.yml up -d

# 检查状态
docker compose -f docker-compose.base.yml -f docker-compose.blue.yml ps
```

---

## 🎯 环境变量检查清单

确保后端容器的环境变量配置正确：

```bash
docker inspect visitor-backend-blue | grep -A 50 "Env"

# 应该包含：
# - REDIS_HOST=redis
# - REDIS_PORT=6379
# - REDIS_PASSWORD=redis123
# - REDIS_URL=redis://:redis123@redis:6379
```

如果环境变量不正确，需要重新创建容器或使用上述一键修复脚本。

---

**修复完成后，后端容器应该能正常启动！🎉**

