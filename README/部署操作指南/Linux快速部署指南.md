# 🚀 访客管理系统 - Linux Docker 部署指南

## 📋 前提条件

- Linux 服务器（推荐 Ubuntu 20.04+ 或 CentOS 7+）
- Docker 20.10+
- Docker Compose 2.0+
- 至少 4GB RAM
- 至少 20GB 磁盘空间

---

## 🔧 第一步：安装 Docker 和 Docker Compose

### Ubuntu/Debian 系统

```bash
# 1. 更新包索引
sudo apt update

# 2. 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. 添加 Docker 官方 GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# 4. 添加 Docker 仓库
sudo add-apt-repository "deb [arch=$(dpkg --print-architecture)] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# 5. 更新包索引
sudo apt update

# 6. 安装 Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 7. 验证安装
docker --version
docker compose version
```

### CentOS/RHEL 系统

```bash
# 1. 安装依赖
sudo yum install -y yum-utils

# 2. 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 3. 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 5. 验证安装
docker --version
docker compose version
```

### 配置 Docker 权限（可选）

```bash
# 将当前用户添加到 docker 组（无需 sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使配置生效
newgrp docker

# 验证权限
docker ps
```

---

## 📥 第二步：获取项目代码

```bash
# 方法1：从 Git 仓库克隆
git clone <your-repository-url> visitor-system
cd visitor-system

# 方法2：上传项目文件到服务器后
cd visitor-system
```

---

## ⚙️ 第三步：配置环境变量

```bash
# 1. 复制环境变量示例文件
cp env.example .env

# 2. 编辑环境变量（使用 vim 或 nano）
vim .env
# 或
nano .env
```

### 必需配置项（最小配置）

```bash
# 数据库密码
POSTGRES_PASSWORD=postgres123

# Redis 密码
REDIS_PASSWORD=redis123

# JWT 密钥（建议使用随机生成的强密钥）
JWT_SECRET=19391a718294795aa6a61a3e9eb837b9644888c0c35ffbe70cea1a57fc097c16

# 邮件配置（根据实际修改）
EMAIL_HOST=mail.wisesystemtech.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-email-password
```

### 生成安全密钥（可选）

```bash
# 生成 JWT 密钥
openssl rand -hex 32

# 生成 Redis 密码
openssl rand -base64 16

# 生成数据库密码
openssl rand -base64 16
```

---

## 🚀 第四步：创建 Docker 网络

```bash
# 创建共享网络
docker network create visitorsystem-network
```

---

## 🏗️ 第五步：启动系统

### 方式1：使用 Makefile（推荐）

```bash
# 一键启动所有服务
make start

# 或使用脚本
./start-containers.sh
```

### 方式2：使用 Docker Compose 命令

```bash
# 方式 2a：首次部署（部署蓝环境）
docker compose -f docker-compose.base.yml -f docker-compose.blue.yml -f docker-compose.nginx.yml up -d --build

# 方式 2b：如果脚本没有执行权限，先添加权限
chmod +x start-containers.sh deploy.sh switch-nginx-env.sh
./start-containers.sh
```

---

## ⏳ 第六步：等待服务启动

```bash
# 查看所有容器状态
docker ps

# 查看容器启动日志（实时）
docker compose -f docker-compose.base.yml -f docker-compose.blue.yml logs -f

# 按 Ctrl+C 退出日志查看
```

### 预期输出

```
NAME                      STATUS          PORTS
visitor-postgres          Up X minutes    0.0.0.0:5432->5432/tcp
visitor-redis             Up X minutes    0.0.0.0:6379->6379/tcp
visitor-adminer           Up X minutes    0.0.0.0:8080->8089/tcp
visitor-backend-blue      Up X minutes    0.0.0.0:3001->3001/tcp
visitor-frontend-blue     Up X minutes    0.0.0.0:3002->3002/tcp
visitor-nginx             Up X minutes    0.0.0.0:80->80/tcp
```

---

## 🔍 第七步：验证部署

```bash
# 1. 检查后端健康状态
curl http://localhost/api/health

# 预期输出: {"status":"ok"}

# 2. 检查前端
curl http://localhost

# 3. 查看系统状态
./switch-nginx-env.sh status
# 或
make status
```

---

## 🌐 第八步：访问系统

| 服务 | 访问地址 | 说明 |
|------|----------|------|
| **主系统** | http://服务器IP 或 http://服务器IP:80 | 访客管理系统（通过Nginx） |
| **前端直接访问** | http://服务器IP:3002 | 前端服务 |
| **后端API** | http://服务器IP:3001/api | 后端API |
| **健康检查** | http://服务器IP/api/health | 系统健康状态 |
| **数据库管理** | http://服务器IP:8080 | Adminer 管理界面 |

### 数据库管理界面配置

访问 http://服务器IP:8080 时，输入：

```
系统: PostgreSQL
服务器: postgres
用户名: postgres
密码: postgres123（或你在 .env 中设置的值）
数据库: visitor_system
```

---

## 📊 常用管理命令

### 查看服务状态

```bash
# 查看容器状态
docker ps

# 查看系统详细状态
make status

# 查看特定服务日志
docker logs visitor-backend-blue -f
docker logs visitor-frontend-blue -f
docker logs visitor-nginx -f
```

### 停止系统

```bash
# 停止所有容器
make stop
# 或
./stop-containers.sh
```

### 重启系统

```bash
# 重启所有容器
make restart
# 或
./restart-containers.sh
```

### 查看日志

```bash
# 查看所有服务日志
make logs

# 查看特定容器日志
docker logs visitor-backend-blue
docker logs visitor-frontend-blue
docker logs visitor-nginx

# 实时查看日志
docker logs -f visitor-backend-blue
```

---

## 🔄 更新部署（零停机部署）

### 部署新版本到绿环境

```bash
# 1. 拉取最新代码
git pull

# 2. 部署绿环境（不停止蓝环境）
docker compose -f docker-compose.base.yml -f docker-compose.green.yml up -d --build

# 3. 等待绿环境启动（查看日志）
docker logs -f visitor-backend-green

# 4. 测试绿环境
curl http://localhost:3003/api/health

# 5. 切换到绿环境
./switch-nginx-env.sh green

# 6. 确认运行正常（等待30分钟后停止蓝环境）
sleep 1800  # 等待30分钟

# 7. 停止蓝环境释放资源（可选）
docker compose -f docker-compose.blue.yml down
```

### 紧急回滚

```bash
# 如果绿环境有问题，立即切换回蓝环境
./switch-nginx-env.sh blue

# 停止有问题的绿环境
docker compose -f docker-compose.green.yml down
```

---

## 🗄️ 数据库管理

### 数据库迁移

```bash
# 进入后端容器
docker exec -it visitor-backend-blue sh

# 执行数据库迁移
npx prisma migrate deploy

# 退出容器
exit
```

### 数据库备份

```bash
# 备份数据库
docker exec visitor-postgres pg_dump -U postgres visitor_system > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 数据库恢复

```bash
# 恢复数据库
cat backup_20250101_120000.sql | docker exec -i visitor-postgres psql -U postgres visitor_system
```

### 查看数据库

```bash
# 进入数据库容器
docker exec -it visitor-postgres psql -U postgres -d visitor_system

# 查看所有表
\dt

# 退出
\q
```

---

## 🐛 故障排查

### 问题1：容器无法启动

```bash
# 查看详细错误日志
docker logs visitor-backend-blue
docker logs visitor-frontend-blue

# 检查网络
docker network inspect visitorsystem-network

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002
```

### 问题2：无法访问系统

```bash
# 检查防火墙
sudo ufw status
# 如果禁用了80端口，开放端口
sudo ufw allow 80/tcp

# 检查容器是否运行
docker ps | grep visitor

# 检查Nginx配置
docker exec visitor-nginx nginx -t
```

### 问题3：数据库连接失败

```bash
# 检查数据库容器状态
docker logs visitor-postgres

# 测试数据库连接
docker exec visitor-postgres pg_isready -U postgres

# 检查环境变量
docker exec visitor-backend-blue env | grep DATABASE
```

### 问题4：端口冲突

```bash
# 查找占用端口的进程
sudo lsof -i :80
sudo lsof -i :5432
sudo lsof -i :6379

# 修改 docker-compose 文件中的端口映射
vim docker-compose.base.yml  # 修改 postgres 和 redis 的端口
vim docker-compose.blue.yml  # 修改应用端口
```

---

## 🧹 清理和重置

### 完全清理

```bash
# 停止所有容器
docker compose down

# 删除所有容器和网络
docker compose -f docker-compose.base.yml -f docker-compose.blue.yml -f docker-compose.green.yml -f docker-compose.nginx.yml down

# 删除数据卷（⚠️ 会删除数据库数据）
docker volume rm visitor_postgres_data visitor_redis_data

# 清理未使用的镜像和容器
docker system prune -a
```

### 重新部署

```bash
# 清理后重新部署
make start
```

---

## 🔒 安全建议

### 1. 修改默认密码

编辑 `.env` 文件，修改以下密码：

```bash
# 使用强密码
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
JWT_SECRET=<strong-random-key>
EMAIL_PASSWORD=<your-email-password>
```

### 2. 配置防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 3. 配置 HTTPS（可选）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 证书会自动续期
```

### 4. 定期更新

```bash
# 更新 Docker
sudo apt update
sudo apt upgrade docker-ce docker-ce-cli containerd.io

# 更新系统
sudo apt update && sudo apt upgrade
```

---

## 📝 快速参考

```bash
# 🚀 启动系统
make start

# 🛑 停止系统
make stop

# 🔄 重启系统
make restart

# 📊 查看状态
make status

# 📋 查看日志
make logs

# 🧹 清理系统
make cleanup

# 🔄 部署新版本
docker compose -f docker-compose.base.yml -f docker-compose.green.yml up -d --build

# 🔀 切换环境
./switch-nginx-env.sh green

# 🔙 回滚环境
./switch-nginx-env.sh blue
```

---

## 📞 技术支持

### 查看详细日志

```bash
# 后端日志
docker logs visitor-backend-blue -f

# 前端日志
docker logs visitor-frontend-blue -f

# Nginx日志
docker logs visitor-nginx -f

# 数据库日志
docker logs visitor-postgres -f
```

### 常用调试命令

```bash
# 进入容器调试
docker exec -it visitor-backend-blue sh

# 检查网络
docker network ls
docker network inspect visitorsystem-network

# 检查资源使用
docker stats

# 查看所有卷
docker volume ls
```

---

## ✅ 部署清单

- [ ] Docker 和 Docker Compose 已安装
- [ ] 项目代码已下载
- [ ] 环境变量已配置（`.env` 文件）
- [ ] Docker 网络已创建
- [ ] 基础服务已启动（PostgreSQL, Redis）
- [ ] 应用服务已启动（Backend, Frontend, Nginx）
- [ ] 数据库已迁移
- [ ] 系统可正常访问
- [ ] 防火墙已配置
- [ ] 备份策略已规划

---

**部署完成后，请访问 http://服务器IP 查看系统！🎉**

