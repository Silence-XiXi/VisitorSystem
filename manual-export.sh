#!/bin/bash

# 手动导出容器脚本
# 使用方法: ./manual-export.sh

set -e

echo "=== 访客管理系统容器导出 ==="

# 创建导出目录
mkdir -p docker-export
cd docker-export

echo "1. 导出基础镜像..."
docker save postgres:15-alpine -o postgres-15-alpine.tar
docker save redis:7-alpine -o redis-7-alpine.tar
docker save adminer:latest -o adminer-latest.tar
docker save nginx:alpine -o nginx-alpine.tar

echo "2. 导出应用镜像..."
docker save visitor-backend-blue:latest -o visitor-backend-blue-latest.tar
docker save visitor-frontend-blue:latest -o visitor-frontend-blue-latest.tar

echo "3. 导出数据卷..."
docker run --rm -v postgres_data:/data -v "$(pwd)":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
docker run --rm -v redis_data:/data -v "$(pwd)":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .

echo "4. 复制配置文件..."
cp ../docker-compose.base.yml .
cp ../docker-compose.blue.yml .
cp ../docker-compose.green.yml .
cp ../docker-compose.nginx.yml .
cp ../deploy.sh .
cp ../env.example .

echo "5. 创建导入脚本..."
cat > import.sh << 'EOF'
#!/bin/bash
echo "=== 导入访客管理系统 ==="

echo "1. 导入镜像..."
docker load -i postgres-15-alpine.tar
docker load -i redis-7-alpine.tar
docker load -i adminer-latest.tar
docker load -i nginx-alpine.tar
docker load -i visitor-backend-blue-latest.tar
docker load -i visitor-frontend-blue-latest.tar

echo "2. 创建网络..."
docker network create visitor-network 2>/dev/null || echo "网络已存在"

echo "3. 创建数据卷..."
docker volume create postgres_data
docker volume create redis_data

echo "4. 导入数据..."
docker run --rm -v postgres_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
docker run --rm -v redis_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/redis_data.tar.gz -C /data

echo "5. 启动服务..."
docker-compose -f docker-compose.base.yml up -d
docker-compose -f docker-compose.blue.yml up -d
docker-compose -f docker-compose.nginx.yml up -d

echo "导入完成！"
EOF

chmod +x import.sh

echo "6. 创建压缩包..."
tar -czf ../visitor-system-export-$(date +%Y%m%d-%H%M%S).tar.gz .

cd ..
echo "=== 导出完成 ==="
echo "压缩包: visitor-system-export-*.tar.gz"
echo "解压后运行: ./import.sh"
