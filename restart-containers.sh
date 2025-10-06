#!/bin/bash

# 访客管理系统 - 容器重启脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 主函数
main() {
    echo -e "${BLUE}🔄 重启访客管理系统...${NC}"
    echo ""
    
    # 停止容器
    log_info "停止现有容器..."
    ./stop-containers.sh > /dev/null 2>&1
    
    # 等待一下
    sleep 3
    
    # 启动容器
    log_info "重新启动容器..."
    ./start-containers.sh
    
    log_success "访客管理系统重启完成！"
}

# 运行主函数
main "$@"
