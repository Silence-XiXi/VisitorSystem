#!/bin/bash

# 使用 Docker Compose 进行容器迁移
# 这种方法适用于有网络访问的情况

set -e

echo "=== Docker Compose 迁移方法 ==="

# 创建迁移包目录
mkdir -p migration-package
cd migration-package

echo "1. 复制所有配置文件..."
cp ../docker-compose.base.yml .
cp ../docker-compose.blue.yml .
cp ../docker-compose.green.yml .
cp ../docker-compose.nginx.yml .
cp ../deploy.sh .
cp ../env.example .
cp -r ../docker .
cp -r ../visitorSystem-backend .
cp -r ../visitorSystem-frontend .

echo "2. 创建环境变量文件..."
cat > .env << 'EOF'
# 数据库配置
POSTGRES_PASSWORD=postgres123

# Redis 配置
REDIS_PASSWORD=redis123

# JWT 配置
JWT_SECRET=your-jwt-secret-key

# 邮件配置 (请根据实际情况修改)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# WhatsApp 配置 (请根据实际情况修改)
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_PHONE_NUMBER=your-phone-number
EOF

echo "3. 创建部署脚本..."
cat > deploy-on-new-server.sh << 'EOF'
#!/bin/bash

# 在新服务器上部署访客管理系统

set -e

echo "=== 在新服务器上部署访客管理系统 ==="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 创建网络
echo "1. 创建 Docker 网络..."
docker network create visitor-network 2>/dev/null || echo "网络已存在"

# 启动基础服务
echo "2. 启动基础服务..."
docker compose -f docker-compose.base.yml up -d

# 等待数据库启动
echo "3. 等待数据库启动..."
sleep 30

# 启动应用服务
echo "4. 启动应用服务..."
docker compose -f docker-compose.blue.yml up -d --build

# 启动 Nginx
echo "5. 启动 Nginx..."
docker compose -f docker-compose.nginx.yml up -d

echo "=== 部署完成 ==="
echo "访问地址: http://localhost"
echo "数据库管理: http://localhost:8080"
echo "检查状态: docker ps"
EOF

chmod +x deploy-on-new-server.sh

echo "4. 创建 README..."
cat > README.md << 'EOF'
# 访客管理系统迁移包

## 使用方法

1. 将整个文件夹复制到新服务器
2. 修改 `.env` 文件中的配置
3. 运行部署脚本：
   ```bash
   ./deploy-on-new-server.sh
   ```

## 文件说明

- `docker-compose.*.yml` - Docker Compose 配置文件
- `deploy.sh` - 原始部署脚本
- `deploy-on-new-server.sh` - 新服务器部署脚本
- `.env` - 环境变量配置
- `docker/` - Docker 相关文件
- `visitorSystem-backend/` - 后端代码
- `visitorSystem-frontend/` - 前端代码

## 注意事项

1. 确保新服务器已安装 Docker 和 Docker Compose
2. 修改 `.env` 文件中的配置信息
3. 确保端口 80, 443, 5432, 6379, 8080 未被占用
4. 如果使用 HTTPS，请配置 SSL 证书

## 访问地址

- 主应用: http://localhost
- 数据库管理: http://localhost:8080
- 后端 API: http://localhost:3001
- 前端: http://localhost:3002
EOF

echo "5. 创建压缩包..."
tar -czf ../visitor-system-compose-migration-$(date +%Y%m%d-%H%M%S).tar.gz .

cd ..
echo "=== 迁移包创建完成 ==="
echo "压缩包: visitor-system-compose-migration-*.tar.gz"
echo "解压后按照 README.md 说明部署"
