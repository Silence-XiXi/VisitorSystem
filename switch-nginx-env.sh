#!/bin/bash

# 访客管理系统 - Nginx环境切换脚本
# 使用方法: ./switch-nginx-env.sh [blue|green]

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

# 检查Nginx是否运行
check_nginx() {
    if ! systemctl is-active --quiet nginx; then
        log_error "Nginx服务未运行，请先启动Nginx"
        exit 1
    fi
    log_success "Nginx服务运行正常"
}

# 切换到蓝环境
switch_to_blue() {
    log_info "切换到蓝环境..."
    
    # 备份当前配置
    sudo cp /etc/nginx/sites-available/visitor-system /etc/nginx/sites-available/visitor-system.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # 创建蓝环境配置
    sudo tee /etc/nginx/sites-available/visitor-system > /dev/null << 'EOF'
server {
    listen 8086;
    server_name localhost;
    
    # 前端代理到蓝环境
    location / {
        proxy_pass http://localhost:3002;  # 蓝环境前端端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API代理到蓝环境
    location /api/ {
        proxy_pass http://localhost:3001/api/;  # 蓝环境后端端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # 测试配置
    if sudo nginx -t; then
        # 重新加载Nginx（零停机）
        sudo systemctl reload nginx
        log_success "已切换到蓝环境"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
}

# 切换到绿环境
switch_to_green() {
    log_info "切换到绿环境..."
    
    # 备份当前配置
    sudo cp /etc/nginx/sites-available/visitor-system /etc/nginx/sites-available/visitor-system.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # 创建绿环境配置
    sudo tee /etc/nginx/sites-available/visitor-system > /dev/null << 'EOF'
server {
    listen 8086;
    server_name localhost;
    
    # 前端代理到绿环境
    location / {
        proxy_pass http://localhost:3004;  # 绿环境前端端口
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API代理到绿环境
    location /api/ {
        proxy_pass http://localhost:3003/api/;  # 绿环境后端端口
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    # 测试配置
    if sudo nginx -t; then
        # 重新加载Nginx（零停机）
        sudo systemctl reload nginx
        log_success "已切换到绿环境"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
}

# 显示当前状态
show_status() {
    log_info "当前Nginx配置状态:"
    echo ""
    
    # 检查当前配置指向哪个环境
    if grep -q "localhost:3002" /etc/nginx/sites-available/visitor-system 2>/dev/null; then
        echo -e "当前环境: ${BLUE}蓝环境${NC} (前端:3002, 后端:3001)"
    elif grep -q "localhost:3004" /etc/nginx/sites-available/visitor-system 2>/dev/null; then
        echo -e "当前环境: ${GREEN}绿环境${NC} (前端:3004, 后端:3003)"
    else
        echo -e "当前环境: ${YELLOW}未知${NC}"
    fi
    
    echo ""
    echo "Nginx服务状态:"
    sudo systemctl status nginx --no-pager -l
}

# 主函数
main() {
    case "${1:-help}" in
        "blue")
            check_nginx
            switch_to_blue
            show_status
            ;;
        "green")
            check_nginx
            switch_to_green
            show_status
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            echo "访客管理系统 Nginx 环境切换脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 blue                    # 切换到蓝环境"
            echo "  $0 green                   # 切换到绿环境"
            echo "  $0 status                  # 显示当前状态"
            echo "  $0 help                    # 显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0 blue                    # 切换到蓝环境"
            echo "  $0 green                   # 切换到绿环境"
            echo "  $0 status                  # 查看当前状态"
            ;;
    esac
}

# 执行主函数
main "$@"
