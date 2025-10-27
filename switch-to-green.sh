#!/bin/bash

# 切换到绿环境（包括Nginx流量切换）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 切换到绿环境...${NC}"
echo ""

# 1. 停止蓝环境容器
echo -e "${YELLOW}1. 停止蓝环境容器...${NC}"
docker stop visitor-backend-blue visitor-frontend-blue 2>/dev/null || true
docker rm visitor-backend-blue visitor-frontend-blue 2>/dev/null || true
echo -e "${GREEN}   ✓ 蓝环境已停止${NC}"
echo ""

# 2. 启动绿环境容器
echo -e "${YELLOW}2. 启动绿环境容器...${NC}"
docker-compose -f docker-compose.green.yml up -d --build
echo -e "${GREEN}   ✓ 绿环境已启动${NC}"
echo ""

# 3. 切换Nginx流量
echo -e "${YELLOW}3. 切换Nginx流量到绿环境...${NC}"
./switch-nginx-env.sh green
echo ""

echo -e "${GREEN}✅ 已切换到绿环境！${NC}"
echo ""
echo "访问地址:"
echo "  主入口: http://localhost:8086"
echo "  绿后端: http://localhost:3003"
echo "  绿前端: http://localhost:3004"
echo "  数据库管理: http://localhost:8089"

