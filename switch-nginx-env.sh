#!/bin/bash

# 访客管理系统 - Docker Nginx环境切换脚本
# 使用方法: ./switch-nginx-env.sh [blue|green|status]

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

# 检测 Docker Compose 命令
detect_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose 未安装"
        exit 1
    fi
}

# 检查 Docker Nginx 容器是否运行
check_nginx() {
    if ! docker ps --format '{{.Names}}' | grep -q "^visitor-nginx$"; then
        log_warning "Docker Nginx容器未运行，正在启动..."
        start_nginx
    else
        log_success "Docker Nginx容器运行正常"
    fi
}

# 启动 Docker Nginx 容器
start_nginx() {
    log_info "启动 Docker Nginx 容器..."
    $COMPOSE_CMD -f docker-compose.nginx.yml up -d
    sleep 3
    if docker ps --format '{{.Names}}' | grep -q "^visitor-nginx$"; then
        log_success "Nginx 容器启动成功"
    else
        log_error "Nginx 容器启动失败"
        exit 1
    fi
}

# 切换到蓝环境
switch_to_blue() {
    log_info "切换到蓝环境..."
    
    # 备份当前配置
    if [ -f "docker/nginx/nginx.conf" ]; then
        cp docker/nginx/nginx.conf docker/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        log_info "已备份当前配置"
    fi
    
    # 复制蓝环境配置到主配置文件
    if [ ! -f "docker/nginx/nginx.blue.conf" ]; then
        log_error "蓝环境配置文件 docker/nginx/nginx.blue.conf 不存在"
        exit 1
    fi
    
    cp docker/nginx/nginx.blue.conf docker/nginx/nginx.conf
    log_info "已更新配置文件指向蓝环境"
    
    # 重新加载 Nginx 配置（零停机）
    log_info "重新加载 Nginx 配置..."
    if docker exec visitor-nginx nginx -t 2>&1; then
        docker exec visitor-nginx nginx -s reload
        log_success "✅ 已切换到蓝环境 (前端: visitor-frontend-blue:3002, 后端: visitor-backend-blue:3001)"
    else
        log_error "Nginx 配置测试失败，正在回滚..."
        # 如果有备份，恢复备份
        LATEST_BACKUP=$(ls -t docker/nginx/nginx.conf.backup.* 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            cp "$LATEST_BACKUP" docker/nginx/nginx.conf
            docker exec visitor-nginx nginx -s reload
            log_warning "已回滚到之前的配置"
        fi
        exit 1
    fi
}

# 切换到绿环境
switch_to_green() {
    log_info "切换到绿环境..."
    
    # 备份当前配置
    if [ -f "docker/nginx/nginx.conf" ]; then
        cp docker/nginx/nginx.conf docker/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
        log_info "已备份当前配置"
    fi
    
    # 复制绿环境配置到主配置文件
    if [ ! -f "docker/nginx/nginx.green.conf" ]; then
        log_error "绿环境配置文件 docker/nginx/nginx.green.conf 不存在"
        exit 1
    fi
    
    cp docker/nginx/nginx.green.conf docker/nginx/nginx.conf
    log_info "已更新配置文件指向绿环境"
    
    # 重新加载 Nginx 配置（零停机）
    log_info "重新加载 Nginx 配置..."
    if docker exec visitor-nginx nginx -t 2>&1; then
        docker exec visitor-nginx nginx -s reload
        log_success "✅ 已切换到绿环境 (前端: visitor-frontend-green:3002, 后端: visitor-backend-green:3001)"
    else
        log_error "Nginx 配置测试失败，正在回滚..."
        # 如果有备份，恢复备份
        LATEST_BACKUP=$(ls -t docker/nginx/nginx.conf.backup.* 2>/dev/null | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            cp "$LATEST_BACKUP" docker/nginx/nginx.conf
            docker exec visitor-nginx nginx -s reload
            log_warning "已回滚到之前的配置"
        fi
        exit 1
    fi
}

# 显示当前状态
show_status() {
    log_info "系统状态检查:"
    echo ""
    
    # 检查 Nginx 容器状态
    if docker ps --format '{{.Names}}\t{{.Status}}' | grep -q "visitor-nginx"; then
        echo -e "${GREEN}✓${NC} Nginx 容器: $(docker ps --format '{{.Status}}' --filter name=visitor-nginx)"
    else
        echo -e "${RED}✗${NC} Nginx 容器: 未运行"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 检查当前配置指向哪个环境
    if [ -f "docker/nginx/nginx.conf" ]; then
        if grep -q "visitor-frontend-blue" docker/nginx/nginx.conf 2>/dev/null; then
            echo -e "📍 当前环境: ${BLUE}蓝环境 (BLUE)${NC}"
            echo "   前端: visitor-frontend-blue:3002"
            echo "   后端: visitor-backend-blue:3001"
        elif grep -q "visitor-frontend-green" docker/nginx/nginx.conf 2>/dev/null; then
            echo -e "📍 当前环境: ${GREEN}绿环境 (GREEN)${NC}"
            echo "   前端: visitor-frontend-green:3002"
            echo "   后端: visitor-backend-green:3001"
        else
            echo -e "📍 当前环境: ${YELLOW}未知${NC}"
        fi
    else
        echo -e "📍 当前环境: ${RED}配置文件不存在${NC}"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 检查蓝环境容器状态
    echo "🔵 蓝环境容器状态:"
    if docker ps --format '{{.Names}}' | grep -q "visitor-backend-blue"; then
        echo -e "   ${GREEN}✓${NC} visitor-backend-blue: $(docker ps --format '{{.Status}}' --filter name=visitor-backend-blue)"
    else
        echo -e "   ${RED}✗${NC} visitor-backend-blue: 未运行"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "visitor-frontend-blue"; then
        echo -e "   ${GREEN}✓${NC} visitor-frontend-blue: $(docker ps --format '{{.Status}}' --filter name=visitor-frontend-blue)"
    else
        echo -e "   ${RED}✗${NC} visitor-frontend-blue: 未运行"
    fi
    
    echo ""
    
    # 检查绿环境容器状态
    echo "🟢 绿环境容器状态:"
    if docker ps --format '{{.Names}}' | grep -q "visitor-backend-green"; then
        echo -e "   ${GREEN}✓${NC} visitor-backend-green: $(docker ps --format '{{.Status}}' --filter name=visitor-backend-green)"
    else
        echo -e "   ${RED}✗${NC} visitor-backend-green: 未运行"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "visitor-frontend-green"; then
        echo -e "   ${GREEN}✓${NC} visitor-frontend-green: $(docker ps --format '{{.Status}}' --filter name=visitor-frontend-green)"
    else
        echo -e "   ${RED}✗${NC} visitor-frontend-green: 未运行"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 检查基础服务状态
    echo "🔧 基础服务状态:"
    if docker ps --format '{{.Names}}' | grep -q "visitor-postgres"; then
        echo -e "   ${GREEN}✓${NC} visitor-postgres: $(docker ps --format '{{.Status}}' --filter name=visitor-postgres)"
    else
        echo -e "   ${RED}✗${NC} visitor-postgres: 未运行"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "visitor-redis"; then
        echo -e "   ${GREEN}✓${NC} visitor-redis: $(docker ps --format '{{.Status}}' --filter name=visitor-redis)"
    else
        echo -e "   ${RED}✗${NC} visitor-redis: 未运行"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 访问地址提示
    echo "🌐 访问地址:"
    echo "   主入口 (通过Nginx): http://localhost:8086"
    echo "   蓝环境前端直连: http://localhost:3002"
    echo "   蓝环境后端直连: http://localhost:3001"
    echo "   绿环境前端直连: http://localhost:3004"
    echo "   绿环境后端直连: http://localhost:3003"
    echo ""
}

# 主函数
main() {
    detect_compose_cmd
    
    case "${1:-help}" in
        "blue")
            check_nginx
            switch_to_blue
            echo ""
            show_status
            ;;
        "green")
            check_nginx
            switch_to_green
            echo ""
            show_status
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "  访客管理系统 - Docker Nginx 环境切换脚本"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "使用方法:"
            echo "  $0 blue        切换到蓝环境"
            echo "  $0 green       切换到绿环境"
            echo "  $0 status      显示当前状态"
            echo "  $0 help        显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 green       # 切换流量到绿环境（零停机）"
            echo "  $0 blue        # 回滚到蓝环境"
            echo "  $0 status      # 查看当前环境和容器状态"
            echo ""
            echo "说明:"
            echo "  - 脚本会自动备份当前配置"
            echo "  - 使用 nginx -s reload 实现零停机切换"
            echo "  - 配置测试失败会自动回滚"
            echo "  - 如果 Nginx 容器未运行，会自动启动"
            echo ""
            ;;
    esac
}

# 执行主函数
main "$@"
