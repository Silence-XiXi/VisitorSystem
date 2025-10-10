#!/bin/bash

# 数据库迁移脚本
# 使用方法: ./migrate-database.sh

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

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    if ! docker ps | grep -q "visitor-postgres"; then
        log_error "PostgreSQL容器未运行"
        exit 1
    fi
    
    # 测试数据库连接
    if docker exec visitor-postgres psql -U postgres -d visitor_system -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败"
        exit 1
    fi
}

# 检查后端容器
check_backend() {
    log_info "检查后端容器..."
    
    if ! docker ps | grep -q "visitor-backend-blue"; then
        log_error "后端容器未运行"
        exit 1
    fi
    
    log_success "后端容器运行正常"
}

# 执行数据库迁移
run_migration() {
    log_info "执行数据库迁移..."
    
    # 方法1: 在后端容器内执行
    if docker exec visitor-backend-blue sh -c "cd /app && npx prisma migrate deploy" 2>/dev/null; then
        log_success "数据库迁移完成"
    else
        log_warning "容器内迁移失败，尝试宿主机迁移..."
        
        # 方法2: 在宿主机执行
        cd visitorSystem-backend
        
        # 设置环境变量
        export DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/visitor_system"
        
        if npx prisma migrate deploy; then
            log_success "宿主机迁移完成"
        else
            log_error "数据库迁移失败"
            exit 1
        fi
        
        cd ..
    fi
}

# 生成Prisma客户端
generate_client() {
    log_info "生成Prisma客户端..."
    
    # 在后端容器内生成
    if docker exec visitor-backend-blue sh -c "cd /app && npx prisma generate" 2>/dev/null; then
        log_success "Prisma客户端生成完成"
    else
        log_warning "容器内生成失败，尝试宿主机生成..."
        
        # 在宿主机生成
        cd visitorSystem-backend
        export DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/visitor_system"
        
        if npx prisma generate; then
            log_success "宿主机Prisma客户端生成完成"
        else
            log_error "Prisma客户端生成失败"
            exit 1
        fi
        
        cd ..
    fi
}

# 验证迁移结果
verify_migration() {
    log_info "验证迁移结果..."
    
    # 检查数据库表
    log_info "检查数据库表..."
    docker exec visitor-postgres psql -U postgres -d visitor_system -c "\dt" | head -20
    
    # 检查迁移历史
    log_info "检查迁移历史..."
    docker exec visitor-postgres psql -U postgres -d visitor_system -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;" 2>/dev/null || log_warning "无法查询迁移历史"
}

# 重启后端服务
restart_backend() {
    log_info "重启后端服务..."
    
    docker restart visitor-backend-blue
    
    # 等待服务启动
    sleep 10
    
    # 检查服务状态
    if docker ps | grep -q "visitor-backend-blue.*Up"; then
        log_success "后端服务重启成功"
    else
        log_error "后端服务重启失败"
        exit 1
    fi
}

# 主函数
main() {
    echo -e "${BLUE}🗄️ 开始数据库迁移...${NC}"
    echo ""
    
    check_database
    check_backend
    run_migration
    generate_client
    verify_migration
    restart_backend
    
    echo ""
    log_success "🎉 数据库迁移完成！"
    echo ""
    echo -e "${GREEN}📋 后续步骤:${NC}"
    echo -e "  1. 检查系统访问: ${BLUE}curl http://localhost:8086${NC}"
    echo -e "  2. 检查API状态: ${BLUE}curl http://localhost:8086/api${NC}"
    echo -e "  3. 检查数据库管理: ${BLUE}http://localhost:8089${NC}"
    echo ""
}

# 执行主函数
main "$@"
