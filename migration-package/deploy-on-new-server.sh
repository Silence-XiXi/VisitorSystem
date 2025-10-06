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
