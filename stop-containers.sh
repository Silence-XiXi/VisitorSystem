#!/bin/bash

# 访客管理系统 - 容器停止脚本

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

# 停止所有容器
stop_containers() {
    log_info "停止访客管理系统容器..."
    
    # 定义容器列表
    containers=(
        "visitor-nginx"
        "visitor-frontend-blue"
        "visitor-backend-blue"
        "visitor-adminer"
        "visitor-redis"
        "visitor-postgres"
    )
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            log_info "停止容器: $container"
            docker stop "$container" > /dev/null 2>&1
            log_success "容器 $container 已停止"
        elif docker ps -a | grep -q "$container"; then
            log_warning "容器 $container 已停止"
        else
            log_warning "容器 $container 不存在"
        fi
    done
}

# 清理容器（可选）
cleanup_containers() {
    if [ "$1" = "--cleanup" ]; then
        log_info "清理容器..."
        
        containers=(
            "visitor-nginx"
            "visitor-frontend-blue"
            "visitor-backend-blue"
            "visitor-adminer"
            "visitor-redis"
            "visitor-postgres"
        )
        
        for container in "${containers[@]}"; do
            if docker ps -a | grep -q "$container"; then
                log_info "删除容器: $container"
                docker rm "$container" > /dev/null 2>&1
                log_success "容器 $container 已删除"
            fi
        done
    fi
}

# 显示状态
show_status() {
    echo ""
    log_info "当前容器状态:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep visitor || echo "没有访客管理系统容器在运行"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}🛑 停止访客管理系统...${NC}"
    echo ""
    
    stop_containers
    cleanup_containers "$1"
    show_status
    
    log_success "访客管理系统已停止"
    echo ""
    echo -e "${GREEN}💡 提示:${NC}"
    echo -e "  重新启动: ${YELLOW}./start-containers.sh${NC}"
    echo -e "  完全清理: ${YELLOW}./stop-containers.sh --cleanup${NC}"
}

# 运行主函数
main "$@"
