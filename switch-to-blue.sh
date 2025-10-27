#!/bin/bash

# 切换到蓝环境（包括Nginx流量切换）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 切换到蓝环境...${NC}"
echo ""

# 1. 停止绿环境容器
echo -e "${YELLOW}1. 停止绿环境容器...${NC}"
docker stop visitor-backend-green visitor-frontend-green 2>/dev/null || true
docker rm visitor-backend-green visitor-frontend-green 2>/dev/null || true
echo -e "${GREEN}   ✓ 绿环境已停止${NC}"
echo ""

# 2. 启动蓝环境容器
echo -e "${YELLOW}2. 启动蓝环境容器...${NC}"
docker-compose -f docker-compose.blue.yml up -d --build
echo -e "${GREEN}   ✓ 蓝环境已启动${NC}"
echo ""

# 3. 切换Nginx流量
echo -e "${YELLOW}3. 切换Nginx流量到蓝环境...${NC}"
./switch-nginx-env.sh blue
echo ""

echo -e "${GREEN}✅ 已切换到蓝环境！${NC}"
echo ""
echo "访问地址:"
echo "  主入口: http://localhost:8086"
echo "  蓝后端: http://localhost:3001"
echo "  蓝前端: http://localhost:3002"
echo "  数据库管理: http://localhost:8089"

