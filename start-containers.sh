#!/bin/bash

# 访客管理系统 - 容器启动脚本
# 作者: AI Assistant
# 日期: $(date +%Y-%m-%d)

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

# 检查Docker是否运行
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker未运行，请先启动Docker"
        exit 1
    fi
    log_success "Docker运行正常"
}

# 创建网络
create_network() {
    log_info "检查Docker网络..."
    if ! docker network ls | grep -q "visitorsystem-network"; then
        log_info "创建Docker网络: visitorsystem-network"
        docker network create visitorsystem-network
    else
        log_success "网络已存在: visitorsystem-network"
    fi
}

# 启动基础服务
start_base_services() {
    log_info "启动基础服务..."
    
    # PostgreSQL数据库
    if ! docker ps | grep -q "visitor-postgres"; then
        log_info "启动PostgreSQL数据库..."
        docker run -d \
            --name visitor-postgres \
            --network visitorsystem-network \
            -p 5432:5432 \
            -e POSTGRES_DB=visitor_system \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres123 \
            -v visitor_postgres_data:/var/lib/postgresql/data \
            postgres:15-alpine
        log_success "PostgreSQL启动成功"
    else
        log_success "PostgreSQL已在运行"
    fi
    
    # Redis缓存
    if ! docker ps | grep -q "visitor-redis"; then
        log_info "启动Redis缓存..."
        docker run -d \
            --name visitor-redis \
            --network visitorsystem-network \
            --network-alias redis \
            -p 6379:6379 \
            -e REDIS_PASSWORD=redis123 \
            redis:7-alpine redis-server --requirepass redis123
        log_success "Redis启动成功"
    else
        log_success "Redis已在运行"
    fi
    
    # Adminer数据库管理
    if ! docker ps | grep -q "visitor-adminer"; then
        log_info "启动Adminer数据库管理..."
        docker run -d \
            --name visitor-adminer \
            --network visitorsystem-network \
            -p 8089:8089 \
            adminer:latest
        log_success "Adminer启动成功"
    else
        log_success "Adminer已在运行"
    fi
}

# 构建应用镜像
build_app_images() {
    log_info "构建应用镜像..."
    
    # 构建前端镜像
    if ! docker images | grep -q "visitor-frontend-blue"; then
        log_info "构建前端镜像..."
        docker build -f docker/frontend/Dockerfile -t visitor-frontend-blue .
        log_success "前端镜像构建完成"
    else
        log_success "前端镜像已存在"
    fi
    
    # 构建后端镜像
    if ! docker images | grep -q "visitor-backend-blue"; then
        log_info "构建后端镜像..."
        docker build -f docker/backend/Dockerfile -t visitor-backend-blue .
        log_success "后端镜像构建完成"
    else
        log_success "后端镜像已存在"
    fi
}

# 启动应用服务
start_app_services() {
    log_info "启动应用服务..."
    
    # 启动后端服务
    if ! docker ps | grep -q "visitor-backend-blue"; then
        log_info "启动后端服务..."
        docker run -d \
            --name visitor-backend-blue \
            --network visitorsystem-network \
            -p 3001:3000 \
            -e NODE_ENV=production \
            -e DATABASE_URL=postgresql://postgres:postgres123@postgres:5432/visitor_system \
            -e REDIS_HOST=redis \
            -e REDIS_PORT=6379 \
            -e REDIS_PASSWORD=redis123 \
            -e REDIS_URL=redis://:redis123@redis:6379 \
            -e JWT_SECRET=19391a718294795aa6a61a3e9eb837b9644888c0c35ffbe70cea1a57fc097c16 \
            -e EMAIL_HOST=mail.wisesystemtech.com \
            -e EMAIL_PORT=587 \
            -e EMAIL_USER=erpsystem@wisesystemtech.com \
            -e EMAIL_PASSWORD=jv7VSByIRIl2lhM5 \
            -e WHATSAPP_API_KEY=1e673379256fe1b0385c97d8120fbb30 \
            -e WHATSAPP_PHONE_NUMBER=+85261606103 \
            visitor-backend-blue
        log_success "后端服务启动成功"
    else
        log_success "后端服务已在运行"
    fi
    
    # 启动前端服务
    if ! docker ps | grep -q "visitor-frontend-blue"; then
        log_info "启动前端服务..."
        docker run -d \
            --name visitor-frontend-blue \
            --network visitorsystem-network \
            -p 3002:80 \
            visitor-frontend-blue
        log_success "前端服务启动成功"
    else
        log_success "前端服务已在运行"
    fi
    
    # 启动Nginx负载均衡器
    if ! docker ps | grep -q "visitor-nginx"; then
        log_info "启动Nginx负载均衡器..."
        docker run -d \
            --name visitor-nginx \
            --network visitorsystem-network \
            -p 8086:80 \
            -v $(pwd)/docker/nginx/nginx.blue.conf:/etc/nginx/nginx.conf \
            nginx:alpine
        log_success "Nginx负载均衡器启动成功"
    else
        log_success "Nginx负载均衡器已在运行"
    fi
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# 显示访问信息
show_access_info() {
    echo ""
    log_success "🎉 访客管理系统启动完成！"
    echo ""
    echo -e "${GREEN}📱 访问地址:${NC}"
    echo -e "  主系统:     ${BLUE}http://localhost:8086${NC}"
    echo -e "  数据库管理: ${BLUE}http://localhost:8089${NC}"
    echo -e "  前端直接:   ${BLUE}http://localhost:3002${NC}"
    echo -e "  后端API:    ${BLUE}http://localhost:3001/api${NC}"
    echo ""
    echo -e "${GREEN}🔧 管理命令:${NC}"
    echo -e "  查看状态:   ${YELLOW}docker ps${NC}"
    echo -e "  查看日志:   ${YELLOW}docker logs <容器名>${NC}"
    echo -e "  停止服务:   ${YELLOW}./stop-containers.sh${NC}"
    echo -e "  重启服务:   ${YELLOW}./restart-containers.sh${NC}"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}🚀 启动访客管理系统...${NC}"
    echo ""
    
    check_docker
    create_network
    start_base_services
    build_app_images
    start_app_services
    wait_for_services
    show_access_info
}

# 运行主函数
main "$@"
