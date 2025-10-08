@echo off
REM 访客管理系统蓝绿部署脚本 (Windows批处理版本)
REM 使用方法: deploy.bat [blue|green|switch] [blue|green]

setlocal enabledelayedexpansion

set ACTION=%1
set ENVIRONMENT=%2

if "%ACTION%"=="" set ACTION=help

REM 检查 Docker 和 Docker Compose 是否安装
:check_dependencies
echo [INFO] 检查依赖...

docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker Desktop
    exit /b 1
)

REM 检查 Docker Compose (支持 v1 和 v2)
set COMPOSE_CMD=
docker-compose --version >nul 2>&1
if not errorlevel 1 (
    set COMPOSE_CMD=docker-compose
    goto :deps_ok
)

docker compose version >nul 2>&1
if not errorlevel 1 (
    set COMPOSE_CMD=docker compose
    goto :deps_ok
)

echo [ERROR] Docker Compose 未安装，请先安装 Docker Compose
exit /b 1

:deps_ok
echo [SUCCESS] 依赖检查通过 (使用: %COMPOSE_CMD%)
goto :main

REM 创建网络
:create_network
echo [INFO] 创建 Docker 网络...
docker network create visitor-network >nul 2>&1
if errorlevel 1 (
    echo [WARNING] 网络已存在
) else (
    echo [SUCCESS] 网络创建成功
)
goto :eof

REM 启动基础服务
:start_base_services
echo [INFO] 启动基础服务 (数据库、Redis)...
%COMPOSE_CMD% -f docker-compose.base.yml up -d
if errorlevel 1 (
    echo [ERROR] 基础服务启动失败
    exit /b 1
)
echo [SUCCESS] 基础服务启动完成
goto :eof

REM 部署蓝环境
:deploy_blue
echo [INFO] 部署蓝环境...

REM 停止绿环境
%COMPOSE_CMD% -f docker-compose.green.yml down >nul 2>&1

REM 启动蓝环境（合并基础服务和蓝环境配置）
%COMPOSE_CMD% -f docker-compose.base.yml -f docker-compose.blue.yml up -d --build
if errorlevel 1 (
    echo [ERROR] 蓝环境部署失败
    exit /b 1
)

REM 等待服务健康检查
echo [INFO] 等待蓝环境服务启动...
timeout /t 30 /nobreak >nul

REM 检查服务状态
%COMPOSE_CMD% -f docker-compose.blue.yml ps | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] 蓝环境部署失败
    exit /b 1
)
echo [SUCCESS] 蓝环境部署成功
goto :eof

REM 部署绿环境
:deploy_green
echo [INFO] 部署绿环境...

REM 停止蓝环境
%COMPOSE_CMD% -f docker-compose.blue.yml down >nul 2>&1

REM 启动绿环境（合并基础服务和绿环境配置）
%COMPOSE_CMD% -f docker-compose.base.yml -f docker-compose.green.yml up -d --build
if errorlevel 1 (
    echo [ERROR] 绿环境部署失败
    exit /b 1
)

REM 等待服务健康检查
echo [INFO] 等待绿环境服务启动...
timeout /t 30 /nobreak >nul

REM 检查服务状态
%COMPOSE_CMD% -f docker-compose.green.yml ps | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] 绿环境部署失败
    exit /b 1
)
echo [SUCCESS] 绿环境部署成功
goto :eof

REM 切换到蓝环境
:switch_to_blue
echo [INFO] 切换到蓝环境...

REM 更新 Nginx 配置
copy "docker\nginx\nginx.blue.conf" "docker\nginx\nginx.conf" /Y >nul

REM 重启 Nginx
%COMPOSE_CMD% -f docker-compose.nginx.yml up -d --force-recreate nginx
if errorlevel 1 (
    echo [ERROR] Nginx 重启失败
    exit /b 1
)
echo [SUCCESS] 已切换到蓝环境
goto :eof

REM 切换到绿环境
:switch_to_green
echo [INFO] 切换到绿环境...

REM 更新 Nginx 配置
copy "docker\nginx\nginx.green.conf" "docker\nginx\nginx.conf" /Y >nul

REM 重启 Nginx
%COMPOSE_CMD% -f docker-compose.nginx.yml up -d --force-recreate nginx
if errorlevel 1 (
    echo [ERROR] Nginx 重启失败
    exit /b 1
)
echo [SUCCESS] 已切换到绿环境
goto :eof

REM 启动 Nginx
:start_nginx
echo [INFO] 启动 Nginx 负载均衡器...
%COMPOSE_CMD% -f docker-compose.nginx.yml up -d
if errorlevel 1 (
    echo [ERROR] Nginx 启动失败
    exit /b 1
)
echo [SUCCESS] Nginx 启动完成
goto :eof

REM 显示状态
:show_status
echo [INFO] 系统状态:
echo.

echo 基础服务:
%COMPOSE_CMD% -f docker-compose.base.yml ps
echo.

echo 蓝环境:
%COMPOSE_CMD% -f docker-compose.blue.yml ps 2>nul
if errorlevel 1 echo 未运行
echo.

echo 绿环境:
%COMPOSE_CMD% -f docker-compose.green.yml ps 2>nul
if errorlevel 1 echo 未运行
echo.

echo Nginx:
%COMPOSE_CMD% -f docker-compose.nginx.yml ps 2>nul
if errorlevel 1 echo 未运行
goto :eof

REM 清理所有服务
:cleanup
echo [WARNING] 清理所有服务...
%COMPOSE_CMD% -f docker-compose.blue.yml down >nul 2>&1
%COMPOSE_CMD% -f docker-compose.green.yml down >nul 2>&1
%COMPOSE_CMD% -f docker-compose.nginx.yml down >nul 2>&1
%COMPOSE_CMD% -f docker-compose.base.yml down >nul 2>&1
docker network rm visitor-network >nul 2>&1
echo [SUCCESS] 清理完成
goto :eof

REM 显示帮助信息
:show_help
echo 访客管理系统蓝绿部署脚本 (批处理版本)
echo.
echo 使用方法:
echo   deploy.bat blue                    # 部署蓝环境
echo   deploy.bat green                   # 部署绿环境
echo   deploy.bat switch blue             # 切换到蓝环境
echo   deploy.bat switch green            # 切换到绿环境
echo   deploy.bat status                  # 显示系统状态
echo   deploy.bat cleanup                 # 清理所有服务
echo   deploy.bat help                    # 显示帮助信息
echo.
echo 示例:
echo   deploy.bat blue                    # 首次部署蓝环境
echo   deploy.bat green                   # 部署新版本到绿环境
echo   deploy.bat switch green            # 切换流量到绿环境
echo   deploy.bat switch blue             # 回滚到蓝环境
goto :eof

REM 主函数
:main
if "%ACTION%"=="blue" (
    call :create_network
    call :start_base_services
    call :deploy_blue
    call :start_nginx
    call :switch_to_blue
    call :show_status
    goto :end
)

if "%ACTION%"=="green" (
    call :create_network
    call :start_base_services
    call :deploy_green
    call :start_nginx
    call :switch_to_green
    call :show_status
    goto :end
)

if "%ACTION%"=="switch" (
    if "%ENVIRONMENT%"=="" (
        echo [ERROR] 请指定要切换到的环境: blue 或 green
        echo 使用方法: deploy.bat switch [blue^|green]
        exit /b 1
    )
    
    if "%ENVIRONMENT%"=="blue" (
        call :switch_to_blue
    ) else if "%ENVIRONMENT%"=="green" (
        call :switch_to_green
    ) else (
        echo [ERROR] 无效的环境: %ENVIRONMENT%，请使用 blue 或 green
        exit /b 1
    )
    call :show_status
    goto :end
)

if "%ACTION%"=="status" (
    call :show_status
    goto :end
)

if "%ACTION%"=="cleanup" (
    call :cleanup
    goto :end
)

if "%ACTION%"=="help" (
    call :show_help
    goto :end
)

call :show_help

:end
endlocal
