# 访客管理系统 Makefile

.PHONY: help start stop restart build deploy-blue deploy-green switch-blue switch-green status cleanup logs

# 默认目标
help:
	@echo "访客管理系统 Docker 部署命令"
	@echo ""
	@echo "🚀 快速启动:"
	@echo "  make start           启动所有容器（推荐）"
	@echo "  make stop            停止所有容器"
	@echo "  make restart         重启所有容器"
	@echo ""
	@echo "🔧 蓝绿部署:"
	@echo "  make deploy-blue     部署蓝环境"
	@echo "  make deploy-green    部署绿环境"
	@echo "  make switch-blue     切换到蓝环境"
	@echo "  make switch-green    切换到绿环境"
	@echo ""
	@echo "📊 管理命令:"
	@echo "  make status          显示系统状态"
	@echo "  make cleanup         清理所有服务"
	@echo "  make logs            查看服务日志"
	@echo "  make build           构建所有镜像"
	@echo ""

# 快速启动所有容器
start:
	@echo "🚀 启动访客管理系统..."
	./start-containers.sh

# 停止所有容器
stop:
	@echo "🛑 停止访客管理系统..."
	./stop-containers.sh

# 重启所有容器
restart:
	@echo "🔄 重启访客管理系统..."
	./restart-containers.sh

# 构建镜像
build:
	@echo "构建前端镜像..."
	docker build -f docker/frontend/Dockerfile -t visitor-frontend-blue .
	@echo "构建后端镜像..."
	docker build -f docker/backend/Dockerfile -t visitor-backend-blue .

# 部署蓝环境
deploy-blue:
	@echo "部署蓝环境..."
	./deploy.sh blue

# 部署绿环境
deploy-green:
	@echo "部署绿环境..."
	./deploy.sh green

# 切换到蓝环境
switch-blue:
	@echo "切换到蓝环境..."
	./deploy.sh switch blue

# 切换到绿环境
switch-green:
	@echo "切换到绿环境..."
	./deploy.sh switch green

# 显示状态
status:
	@echo "系统状态:"
	./deploy.sh status

# 清理所有服务
cleanup:
	@echo "清理所有服务..."
	./deploy.sh cleanup

# 查看日志
logs:
	@echo "查看服务日志..."
	@echo "选择要查看的服务:"
	@echo "1) 蓝环境后端"
	@echo "2) 绿环境后端"
	@echo "3) Nginx"
	@echo "4) 数据库"
	@echo "5) Redis"
	@read -p "请输入选择 (1-5): " choice; \
	case $$choice in \
		1) docker logs visitor-backend-blue -f ;; \
		2) docker logs visitor-backend-green -f ;; \
		3) docker logs visitor-nginx -f ;; \
		4) docker logs visitor-postgres -f ;; \
		5) docker logs visitor-redis -f ;; \
		*) echo "无效选择" ;; \
	esac

# 快速部署（首次使用）
quick-start:
	@echo "快速启动系统..."
	@if [ ! -f .env ]; then \
		echo "复制环境变量文件..."; \
		cp env.example .env; \
		echo "请编辑 .env 文件配置环境变量"; \
		exit 1; \
	fi
	./deploy.sh blue

# 开发环境
dev:
	@echo "启动开发环境..."
	docker-compose -f docker-compose.base.yml up -d
	@echo "基础服务已启动，请手动启动前端和后端开发服务器"

# 停止开发环境
dev-stop:
	@echo "停止开发环境..."
	docker-compose -f docker-compose.base.yml down
