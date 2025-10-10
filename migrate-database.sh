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
generate_prisma_client() {
    log_info "生成Prisma客户端..."
    
    # 确定使用的用户权限
    local docker_user=""
    if [[ "$FORCE_ROOT" == "true" ]]; then
        docker_user="--user root"
        log_info "使用root权限执行Prisma操作"
    fi
    
    # 先清理旧的Prisma客户端
    log_info "清理旧的Prisma客户端..."
    if docker exec $docker_user visitor-backend-blue sh -c "cd /app && rm -rf node_modules/.prisma/client" 2>/dev/null; then
        log_success "旧Prisma客户端清理完成"
    else
        if [[ "$FORCE_ROOT" != "true" ]]; then
            log_warning "清理旧Prisma客户端时遇到权限问题，尝试使用root权限..."
            if docker exec --user root visitor-backend-blue sh -c "cd /app && rm -rf node_modules/.prisma/client" 2>/dev/null; then
                log_success "旧Prisma客户端清理完成（使用root权限）"
            else
                log_warning "清理失败，继续尝试生成..."
            fi
        else
            log_warning "清理失败，继续尝试生成..."
        fi
    fi
    
    # 生成Prisma客户端
    if docker exec $docker_user visitor-backend-blue sh -c "cd /app && npx prisma generate" 2>/dev/null; then
        log_success "Prisma客户端生成完成"
    else
        if [[ "$FORCE_ROOT" != "true" ]]; then
            log_warning "普通权限生成失败，尝试使用root权限..."
            
            # 使用root权限重新生成
            if docker exec --user root visitor-backend-blue sh -c "cd /app && npx prisma generate" 2>/dev/null; then
                log_success "Prisma客户端生成完成（使用root权限）"
            else
                log_error "Prisma客户端生成失败"
                log_info "请手动执行以下命令之一:"
                log_info "1. docker exec -it --user root visitor-backend-blue sh -c 'cd /app && rm -rf node_modules/.prisma/client && npx prisma generate'"
                log_info "2. docker exec -it visitor-backend-blue sh -c 'cd /app && npx prisma generate'"
                return 1
            fi
        else
            log_error "Prisma客户端生成失败"
            log_info "请手动执行: docker exec -it --user root visitor-backend-blue sh -c 'cd /app && rm -rf node_modules/.prisma/client && npx prisma generate'"
            return 1
        fi
    fi
}

# 执行种子数据
run_seed_data() {
    log_info "执行种子数据..."
    
    # 在后端容器内使用ts-node执行种子数据
    if docker exec visitor-backend-blue sh -c "cd /app && npx ts-node --esm prisma/seed.ts" 2>/dev/null; then
        log_success "种子数据执行完成"
    else
        log_warning "ts-node --esm执行失败，尝试使用tsx..."
        
        # 尝试使用tsx执行
        if docker exec visitor-backend-blue sh -c "cd /app && npx tsx prisma/seed.ts" 2>/dev/null; then
            log_success "种子数据执行完成"
        else
            log_warning "tsx执行失败，尝试编译后执行..."
            
            # 尝试编译后执行
            if docker exec visitor-backend-blue sh -c "cd /app && npx tsc prisma/seed.ts --outDir temp --target es2020 --module commonjs && node temp/prisma/seed.js" 2>/dev/null; then
                log_success "种子数据执行完成"
            else
                log_warning "编译执行失败，尝试使用prisma db seed..."
                
                # 尝试使用prisma的db seed命令
                if docker exec visitor-backend-blue sh -c "cd /app && npx prisma db seed" 2>/dev/null; then
                    log_success "种子数据执行完成"
                else
                    log_error "所有种子数据执行方式都失败了"
                    log_info "请手动执行以下命令之一:"
                    log_info "1. docker exec -it visitor-backend-blue sh -c 'cd /app && npx ts-node --esm prisma/seed.ts'"
                    log_info "2. docker exec -it visitor-backend-blue sh -c 'cd /app && npx tsx prisma/seed.ts'"
                    log_info "3. docker exec -it visitor-backend-blue sh -c 'cd /app && npx prisma db seed'"
                    return 1
                fi
            fi
        fi
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

# 显示帮助信息
show_help() {
    echo -e "${BLUE}数据库迁移脚本使用说明${NC}"
    echo ""
    echo -e "${YELLOW}用法:${NC}"
    echo "  ./migrate-database.sh [选项]"
    echo ""
    echo -e "${YELLOW}选项:${NC}"
    echo "  -h, --help     显示此帮助信息"
    echo "  --skip-seed    跳过种子数据执行"
    echo "  --skip-restart 跳过后端服务重启"
    echo "  --force-root   强制使用root权限执行所有操作"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  ./migrate-database.sh                    # 完整迁移"
    echo "  ./migrate-database.sh --skip-seed         # 跳过种子数据"
    echo "  ./migrate-database.sh --force-root        # 强制使用root权限"
    echo ""
}

# 主函数
main() {
    # 解析命令行参数
    SKIP_SEED=false
    SKIP_RESTART=false
    FORCE_ROOT=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --skip-seed)
                SKIP_SEED=true
                shift
                ;;
            --skip-restart)
                SKIP_RESTART=true
                shift
                ;;
            --force-root)
                FORCE_ROOT=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}🗄️ 开始数据库迁移...${NC}"
    if [[ "$FORCE_ROOT" == "true" ]]; then
        log_info "强制使用root权限模式"
    fi
    echo ""
    
    check_database
    check_backend
    run_migration
    generate_prisma_client
    
    if [[ "$SKIP_SEED" != "true" ]]; then
        run_seed_data
    else
        log_info "跳过种子数据执行"
    fi
    
    verify_migration
    
    if [[ "$SKIP_RESTART" != "true" ]]; then
        restart_backend
    else
        log_info "跳过后端服务重启"
    fi
    
    echo ""
    log_success "🎉 数据库迁移完成！"
    echo ""
    echo -e "${GREEN}📋 默认登录账号:${NC}"
    echo -e "  管理员: ${BLUE}admin / admin123${NC}"
    echo -e "  分判商: ${BLUE}bjadmin / dist123${NC}"
    echo -e "  分判商: ${BLUE}shadmin / dist123${NC}"
    echo -e "  分判商: ${BLUE}gzadmin / dist123${NC}"
    echo -e "  门卫: ${BLUE}guard001 / guard123${NC}"
    echo -e "  门卫: ${BLUE}guard002 / guard123${NC}"
    echo -e "  门卫: ${BLUE}guard003 / guard123${NC}"
    echo ""
}

# 执行主函数
main "$@"
