#!/bin/bash

# 访客管理系统蓝绿部署脚本
# 使用方法: ./deploy.sh [blue|green|switch]

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

# 检查 Docker 和 Docker Compose 是否安装
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose (支持 v1 和 v2)
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "依赖检查通过 (使用: $COMPOSE_CMD)"
}

# 创建网络
create_network() {
    log_info "创建 Docker 网络..."
    docker network create visitor-network 2>/dev/null || log_warning "网络已存在"
}

# 启动基础服务
start_base_services() {
    log_info "启动基础服务 (数据库、Redis)..."
    $COMPOSE_CMD -f docker-compose.base.yml up -d
    log_success "基础服务启动完成"
}

# 部署蓝环境
deploy_blue() {
    log_info "部署蓝环境..."
    
    # 停止绿环境
    $COMPOSE_CMD -f docker-compose.green.yml down 2>/dev/null || true
    
    # 启动蓝环境（合并基础服务和蓝环境配置）
    $COMPOSE_CMD -f docker-compose.base.yml -f docker-compose.blue.yml up -d --build
    
    # 等待服务健康检查
    log_info "等待蓝环境服务启动..."
    sleep 30
    
    # 检查服务状态
    if $COMPOSE_CMD -f docker-compose.blue.yml ps | grep -q "Up"; then
        log_success "蓝环境部署成功"
    else
        log_error "蓝环境部署失败"
        exit 1
    fi
}

# 部署绿环境
deploy_green() {
    log_info "部署绿环境..."
    
    # 停止蓝环境
    $COMPOSE_CMD -f docker-compose.blue.yml down 2>/dev/null || true
    
    # 启动绿环境（合并基础服务和绿环境配置）
    $COMPOSE_CMD -f docker-compose.base.yml -f docker-compose.green.yml up -d --build
    
    # 等待服务健康检查
    log_info "等待绿环境服务启动..."
    sleep 30
    
    # 检查服务状态
    if $COMPOSE_CMD -f docker-compose.green.yml ps | grep -q "Up"; then
        log_success "绿环境部署成功"
    else
        log_error "绿环境部署失败"
        exit 1
    fi
}

# 切换到蓝环境
switch_to_blue() {
    log_info "切换到蓝环境..."
    
    # 更新 Nginx 配置
    cp docker/nginx/nginx.blue.conf docker/nginx/nginx.conf
    
    # 重启 Nginx
    $COMPOSE_CMD -f docker-compose.nginx.yml up -d --force-recreate nginx
    
    log_success "已切换到蓝环境"
}

# 切换到绿环境
switch_to_green() {
    log_info "切换到绿环境..."
    
    # 更新 Nginx 配置
    cp docker/nginx/nginx.green.conf docker/nginx/nginx.conf
    
    # 重启 Nginx
    $COMPOSE_CMD -f docker-compose.nginx.yml up -d --force-recreate nginx
    
    log_success "已切换到绿环境"
}

# 启动 Nginx
start_nginx() {
    log_info "启动 Nginx 负载均衡器..."
    $COMPOSE_CMD -f docker-compose.nginx.yml up -d
    log_success "Nginx 启动完成"
}

# 显示状态
show_status() {
    log_info "系统状态:"
    echo ""
    
    echo "基础服务:"
    $COMPOSE_CMD -f docker-compose.base.yml ps
    echo ""
    
    echo "蓝环境:"
    $COMPOSE_CMD -f docker-compose.blue.yml ps 2>/dev/null || echo "未运行"
    echo ""
    
    echo "绿环境:"
    $COMPOSE_CMD -f docker-compose.green.yml ps 2>/dev/null || echo "未运行"
    echo ""
    
    echo "Nginx:"
    $COMPOSE_CMD -f docker-compose.nginx.yml ps 2>/dev/null || echo "未运行"
}

# 清理所有服务
cleanup() {
    log_warning "清理所有服务..."
    $COMPOSE_CMD -f docker-compose.blue.yml down 2>/dev/null || true
    $COMPOSE_CMD -f docker-compose.green.yml down 2>/dev/null || true
    $COMPOSE_CMD -f docker-compose.nginx.yml down 2>/dev/null || true
    $COMPOSE_CMD -f docker-compose.base.yml down 2>/dev/null || true
    docker network rm visitor-network 2>/dev/null || true
    log_success "清理完成"
}

# 主函数
main() {
    case "${1:-help}" in
        "blue")
            check_dependencies
            create_network
            start_base_services
            deploy_blue
            start_nginx
            switch_to_blue
            show_status
            ;;
        "green")
            check_dependencies
            create_network
            start_base_services
            deploy_green
            start_nginx
            switch_to_green
            show_status
            ;;
        "switch")
            if [ -z "$2" ]; then
                log_error "请指定要切换到的环境: blue 或 green"
                exit 1
            fi
            
            case "$2" in
                "blue")
                    switch_to_blue
                    ;;
                "green")
                    switch_to_green
                    ;;
                *)
                    log_error "无效的环境: $2，请使用 blue 或 green"
                    exit 1
                    ;;
            esac
            show_status
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|*)
            echo "访客管理系统蓝绿部署脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 blue                    # 部署蓝环境"
            echo "  $0 green                   # 部署绿环境"
            echo "  $0 switch blue             # 切换到蓝环境"
            echo "  $0 switch green            # 切换到绿环境"
            echo "  $0 status                  # 显示系统状态"
            echo "  $0 cleanup                 # 清理所有服务"
            echo "  $0 help                    # 显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 blue                    # 首次部署蓝环境"
            echo "  $0 green                   # 部署新版本到绿环境"
            echo "  $0 switch green            # 切换流量到绿环境"
            echo "  $0 switch blue             # 回滚到蓝环境"
            ;;
    esac
}

# 执行主函数
main "$@"
