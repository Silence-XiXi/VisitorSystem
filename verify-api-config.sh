#!/bin/bash

# API配置验证脚本
echo "=== 访客管理系统 API 配置验证 ==="
echo

# 检查环境变量文件
echo "1. 检查环境变量配置文件..."
if [ -f "env.development" ]; then
    echo "✓ env.development 存在"
    echo "  开发环境API地址: $(grep VITE_API_BASE_URL env.development)"
else
    echo "✗ env.development 不存在"
fi

if [ -f "env.production" ]; then
    echo "✓ env.production 存在"
    echo "  生产环境API地址: $(grep VITE_API_BASE_URL env.production)"
else
    echo "✗ env.production 不存在"
fi

echo

# 检查Docker配置文件
echo "2. 检查Docker配置文件..."
if [ -f "docker/frontend/Dockerfile" ]; then
    echo "✓ Dockerfile 存在"
    if grep -q "ARG VITE_API_BASE_URL" docker/frontend/Dockerfile; then
        echo "✓ Dockerfile 支持构建参数"
    else
        echo "✗ Dockerfile 不支持构建参数"
    fi
else
    echo "✗ Dockerfile 不存在"
fi

if [ -f "docker/frontend/Dockerfile.green" ]; then
    echo "✓ Dockerfile.green 存在"
    if grep -q "ARG VITE_API_BASE_URL" docker/frontend/Dockerfile.green; then
        echo "✓ Dockerfile.green 支持构建参数"
    else
        echo "✗ Dockerfile.green 不支持构建参数"
    fi
else
    echo "✗ Dockerfile.green 不存在"
fi

echo

# 检查docker-compose配置
echo "3. 检查docker-compose配置..."
if [ -f "docker-compose.blue.yml" ]; then
    echo "✓ docker-compose.blue.yml 存在"
    if grep -q "VITE_API_BASE_URL" docker-compose.blue.yml; then
        echo "✓ 蓝环境配置包含API地址设置"
    else
        echo "✗ 蓝环境配置缺少API地址设置"
    fi
else
    echo "✗ docker-compose.blue.yml 不存在"
fi

if [ -f "docker-compose.green.yml" ]; then
    echo "✓ docker-compose.green.yml 存在"
    if grep -q "VITE_API_BASE_URL" docker-compose.green.yml; then
        echo "✓ 绿环境配置包含API地址设置"
    else
        echo "✗ 绿环境配置缺少API地址设置"
    fi
else
    echo "✗ docker-compose.green.yml 不存在"
fi

echo

# 检查前端API服务代码
echo "4. 检查前端API服务代码..."
if [ -f "visitorSystem-frontend/src/services/api.ts" ]; then
    echo "✓ API服务文件存在"
    if grep -q "isDockerEnvironment" visitorSystem-frontend/src/services/api.ts; then
        echo "✓ API服务支持Docker环境检测"
    else
        echo "✗ API服务不支持Docker环境检测"
    fi
    
    if grep -q "visitor-backend-blue" visitorSystem-frontend/src/services/api.ts; then
        echo "✓ API服务支持容器名访问"
    else
        echo "✗ API服务不支持容器名访问"
    fi
else
    echo "✗ API服务文件不存在"
fi

echo

# 显示配置建议
echo "5. 配置建议..."
echo "开发环境:"
echo "  export VITE_API_BASE_URL=http://localhost:3001"
echo
echo "生产环境 (蓝环境):"
echo "  export VITE_API_BASE_URL=http://visitor-backend-blue:3001"
echo
echo "生产环境 (绿环境):"
echo "  export VITE_API_BASE_URL=http://visitor-backend-green:3001"
echo
echo "通过nginx代理:"
echo "  export VITE_API_BASE_URL=http://your-domain.com/api"

echo
echo "=== 验证完成 ==="
