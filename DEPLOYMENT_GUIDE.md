# 访客系统部署指南

本文档提供在Linux环境下使用Docker部署访客系统的详细步骤。

## 前提条件

- Linux服务器（推荐Ubuntu 20.04 LTS或更高版本）
- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git

## 1. 安装Docker和Docker Compose

```bash
# 更新包索引
sudo apt update

# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# 添加Docker源
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# 更新包索引
sudo apt update

# 安装Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组（可选，避免每次都使用sudo）
sudo usermod -aG docker $USER
```

添加用户到docker组后，需要注销并重新登录才能生效。

## 2. 克隆项目

```bash
# 克隆项目到本地
git clone [你的项目Git仓库地址] visitor-system
cd visitor-system
```

## 3. 配置环境变量

编辑docker-compose.yml文件，修改以下环境变量：

```yaml
environment:
  - NODE_ENV=production
  - DATABASE_URL=postgresql://postgres:postgres@db:5432/visitorsystem  # 根据需要修改数据库凭据
  - REDIS_HOST=redis
  - REDIS_PORT=6379
  - JWT_SECRET=your_jwt_secret_key_here  # 修改为安全的JWT密钥
  - EMAIL_HOST=smtp.example.com  # 修改为您的SMTP服务器
  - EMAIL_PORT=587  # 修改为您的SMTP端口
  - EMAIL_USER=your_email@example.com  # 修改为您的邮箱账号
  - EMAIL_PASSWORD=your_email_password  # 修改为您的邮箱密码
```

## 4. 构建和启动容器

```bash
# 构建和启动所有容器
docker-compose up -d

# 查看容器状态
docker-compose ps
```

## 5. 初始化数据库

```bash
# 进入后端容器
docker-compose exec backend sh

# 执行数据库迁移
npx prisma migrate deploy

# 执行数据库种子脚本（如果有）
npx prisma db seed

# 退出容器
exit
```

## 6. 访问系统

- 前端访问地址：http://服务器IP地址
- 后端API地址：http://服务器IP地址/api

## 7. 管理命令

```bash
# 查看容器日志
docker-compose logs -f

# 仅查看后端日志
docker-compose logs -f backend

# 停止所有容器
docker-compose down

# 停止并删除所有卷（会删除数据库数据）
docker-compose down -v

# 重启所有容器
docker-compose restart

# 重启单个容器
docker-compose restart backend
```

## 8. 备份与恢复

### 数据库备份

```bash
# 备份PostgreSQL数据库
docker-compose exec db pg_dump -U postgres visitorsystem > backup_$(date +%Y%m%d).sql
```

### 数据库恢复

```bash
# 恢复PostgreSQL数据库
cat backup_20250930.sql | docker-compose exec -T db psql -U postgres visitorsystem
```

## 9. 系统更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动容器
docker-compose up -d --build
```

## 10. 常见问题排查

### 容器无法启动

检查日志：
```bash
docker-compose logs
```

### 数据库连接问题

1. 确认数据库容器是否正常运行
2. 检查数据库连接字符串是否正确
3. 检查后端日志中的数据库连接错误信息

### 前端无法访问

1. 确认nginx配置是否正确
2. 检查前端容器日志
3. 确认后端API是否正常运行

## 11. 安全建议

1. 修改所有默认密码，包括数据库密码和JWT密钥
2. 配置HTTPS（使用Certbot和Let's Encrypt获取免费证书）
3. 配置防火墙，只开放必要端口
4. 定期更新Docker镜像和系统安全补丁
