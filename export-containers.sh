#!/bin/bash

# 访客管理系统容器导出脚本
# 使用方法: ./export-containers.sh [export|import]

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

# 创建导出目录
EXPORT_DIR="./docker-export"
mkdir -p "$EXPORT_DIR"

# 导出镜像
export_images() {
    log_info "开始导出镜像..."
    
    # 基础镜像
    docker save postgres:15-alpine -o "$EXPORT_DIR/postgres-15-alpine.tar"
    docker save redis:7-alpine -o "$EXPORT_DIR/redis-7-alpine.tar"
    docker save adminer:latest -o "$EXPORT_DIR/adminer-latest.tar"
    docker save nginx:alpine -o "$EXPORT_DIR/nginx-alpine.tar"
    
    # 应用镜像
    docker save visitor-backend-blue:latest -o "$EXPORT_DIR/visitor-backend-blue-latest.tar"
    docker save visitor-frontend-blue:latest -o "$EXPORT_DIR/visitor-frontend-blue-latest.tar"
    
    log_success "镜像导出完成"
}

# 导出数据卷
export_volumes() {
    log_info "开始导出数据卷..."
    
    # 创建数据卷备份
    docker run --rm -v postgres_data:/data -v "$(pwd)/$EXPORT_DIR":/backup alpine tar czf /backup/postgres_data.tar.gz -C /data .
    docker run --rm -v redis_data:/data -v "$(pwd)/$EXPORT_DIR":/backup alpine tar czf /backup/redis_data.tar.gz -C /data .
    
    log_success "数据卷导出完成"
}

# 导出网络配置
export_networks() {
    log_info "开始导出网络配置..."
    
    # 导出网络信息
    docker network inspect visitor-network > "$EXPORT_DIR/visitor-network.json"
    
    log_success "网络配置导出完成"
}

# 导出容器配置
export_container_configs() {
    log_info "开始导出容器配置..."
    
    # 导出所有容器配置
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" > "$EXPORT_DIR/containers-info.txt"
    
    # 导出 compose 文件
    cp docker-compose.base.yml "$EXPORT_DIR/"
    cp docker-compose.blue.yml "$EXPORT_DIR/"
    cp docker-compose.green.yml "$EXPORT_DIR/"
    cp docker-compose.nginx.yml "$EXPORT_DIR/"
    cp deploy.sh "$EXPORT_DIR/"
    
    # 导出环境变量示例
    cp env.example "$EXPORT_DIR/"
    
    log_success "容器配置导出完成"
}

# 创建导入脚本
create_import_script() {
    log_info "创建导入脚本..."
    
    cat > "$EXPORT_DIR/import-containers.sh" << 'EOF'
#!/bin/bash

# 访客管理系统容器导入脚本
# 使用方法: ./import-containers.sh

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

# 导入镜像
import_images() {
    log_info "开始导入镜像..."
    
    # 基础镜像
    docker load -i postgres-15-alpine.tar
    docker load -i redis-7-alpine.tar
    docker load -i adminer-latest.tar
    docker load -i nginx-alpine.tar
    
    # 应用镜像
    docker load -i visitor-backend-blue-latest.tar
    docker load -i visitor-frontend-blue-latest.tar
    
    log_success "镜像导入完成"
}

# 创建网络
create_network() {
    log_info "创建 Docker 网络..."
    docker network create visitor-network 2>/dev/null || log_warning "网络已存在"
}

# 导入数据卷
import_volumes() {
    log_info "开始导入数据卷..."
    
    # 创建数据卷
    docker volume create postgres_data
    docker volume create redis_data
    
    # 导入数据
    docker run --rm -v postgres_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
    docker run --rm -v redis_data:/data -v "$(pwd)":/backup alpine tar xzf /backup/redis_data.tar.gz -C /data
    
    log_success "数据卷导入完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动基础服务
    docker-compose -f docker-compose.base.yml up -d
    
    # 启动蓝环境
    docker-compose -f docker-compose.blue.yml up -d
    
    # 启动 Nginx
    docker-compose -f docker-compose.nginx.yml up -d
    
    log_success "服务启动完成"
}

# 主函数
main() {
    log_info "开始导入访客管理系统..."
    
    import_images
    create_network
    import_volumes
    start_services
    
    log_success "导入完成！"
    log_info "请检查服务状态: docker ps"
}

# 执行主函数
main "$@"
EOF

    chmod +x "$EXPORT_DIR/import-containers.sh"
    log_success "导入脚本创建完成"
}

# 创建压缩包
create_archive() {
    log_info "创建压缩包..."
    
    cd "$EXPORT_DIR"
    tar -czf "../visitor-system-export-$(date +%Y%m%d-%H%M%S).tar.gz" .
    cd ..
    
    log_success "压缩包创建完成: visitor-system-export-$(date +%Y%m%d-%H%M%S).tar.gz"
}

# 主函数
main() {
    case "${1:-export}" in
        "export")
            log_info "开始导出访客管理系统..."
            
            export_images
            export_volumes
            export_networks
            export_container_configs
            create_import_script
            create_archive
            
            log_success "导出完成！"
            log_info "导出文件位置: $EXPORT_DIR"
            log_info "压缩包: visitor-system-export-*.tar.gz"
            ;;
        "help"|*)
            echo "访客管理系统容器导出脚本"
            echo ""
            echo "使用方法:"
            echo "  $0 export    # 导出所有容器和配置"
            echo "  $0 help      # 显示帮助信息"
            echo ""
            echo "导出内容包括:"
            echo "  - 所有 Docker 镜像"
            echo "  - 数据卷数据"
            echo "  - 网络配置"
            echo "  - Docker Compose 文件"
            echo "  - 部署脚本"
            echo "  - 导入脚本"
            ;;
    esac
}

# 执行主函数
main "$@"
