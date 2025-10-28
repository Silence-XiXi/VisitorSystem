# 访客管理系统蓝绿部署脚本 (Windows PowerShell版本)
# 使用方法: .\deploy.ps1 [blue|green|switch] [blue|green]

param(
    [Parameter(Position=0)]
    [ValidateSet("blue", "green", "switch", "status", "cleanup", "help")]
    [string]$Action = "help",
    
    [Parameter(Position=1)]
    [ValidateSet("blue", "green")]
    [string]$Environment = ""
)

# 颜色定义
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# 日志函数
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# 检查端口占用
function Test-PortAvailability {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $false  # 端口被占用
    }
    catch {
        return $true   # 端口可用
    }
}

# 清理端口占用
function Clear-PortConflict {
    param([int]$Port)
    
    Write-LogInfo "检查端口 $Port 占用情况..."
    
    try {
        $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($processes) {
            foreach ($process in $processes) {
                $pid = $process.OwningProcess
                $processInfo = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($processInfo) {
                    Write-LogWarning "发现进程 $($processInfo.ProcessName) (PID: $pid) 占用端口 $Port"
                    Write-LogInfo "正在终止进程..."
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 2
                }
            }
        }
    }
    catch {
        Write-LogWarning "无法检查端口占用情况，继续执行..."
    }
}

# 等待服务健康检查
function Wait-ForServiceHealth {
    param(
        [string]$ComposeCmd,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 60
    )
    
    Write-LogInfo "等待服务 $ServiceName 健康检查..."
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            # 使用正确的Docker Compose命令格式
            $status = Invoke-Expression "$ComposeCmd -f docker-compose.base.yml -f docker-compose.blue.yml ps $ServiceName"
            if ($status -match "healthy|Up") {
                Write-LogSuccess "服务 $ServiceName 已就绪"
                return $true
            }
        }
        catch {
            # 忽略错误，继续检查
        }
        
        Start-Sleep -Seconds 5
        $elapsed += 5
    }
    
    Write-LogError "服务 $ServiceName 健康检查超时"
    return $false
}

# 检查 Docker 和 Docker Compose 是否安装
function Test-Dependencies {
    Write-LogInfo "检查依赖..."
    
    # 检查 Docker
    try {
        $null = docker --version
    }
    catch {
        Write-LogError "Docker 未安装，请先安装 Docker Desktop"
        exit 1
    }
    
    # 检查 Docker Compose (支持 v1 和 v2)
    $ComposeCmd = $null
    try {
        $null = docker-compose --version
        $ComposeCmd = "docker-compose"
    }
    catch {
        try {
            $null = docker compose version
            $ComposeCmd = "docker compose"
        }
        catch {
            Write-LogError "Docker Compose 未安装，请先安装 Docker Compose"
            exit 1
        }
    }
    
    Write-LogSuccess "依赖检查通过 (使用: $ComposeCmd)"
    return $ComposeCmd
}

# 创建网络
function New-DockerNetwork {
    Write-LogInfo "创建 Docker 网络..."
    try {
        docker network create visitor-network 2>$null
        Write-LogSuccess "网络创建成功"
    }
    catch {
        Write-LogWarning "网络已存在"
    }
}

# 启动基础服务
function Start-BaseServices {
    param([string]$ComposeCmd)
    
    Write-LogInfo "启动基础服务 (数据库、Redis)..."
    Invoke-Expression "$ComposeCmd -f docker-compose.base.yml up -d"
    Write-LogSuccess "基础服务启动完成"
}

# 部署蓝环境
function Deploy-Blue {
    param([string]$ComposeCmd)
    
    Write-LogInfo "部署蓝环境..."
    
    # 检查并清理端口冲突
    Clear-PortConflict -Port 3001
    Clear-PortConflict -Port 3002
    
    # 停止绿环境
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.green.yml down" 2>$null
    }
    catch {
        # 忽略错误，绿环境可能未运行
    }
    
    # 启动蓝环境（合并基础服务和蓝环境配置）
    Write-LogInfo "启动蓝环境服务..."
    Invoke-Expression "$ComposeCmd -f docker-compose.base.yml -f docker-compose.blue.yml up -d --build"
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "蓝环境启动失败"
        exit 1
    }
    
    # 等待服务健康检查
    $backendReady = Wait-ForServiceHealth -ComposeCmd $ComposeCmd -ServiceName "backend-blue" -TimeoutSeconds 60
    $frontendReady = Wait-ForServiceHealth -ComposeCmd $ComposeCmd -ServiceName "frontend-blue" -TimeoutSeconds 60
    
    if ($backendReady -and $frontendReady) {
        Write-LogSuccess "蓝环境部署成功"
    }
    else {
        Write-LogError "蓝环境部署失败 - 服务未就绪"
        exit 1
    }
}

# 部署绿环境
function Deploy-Green {
    param([string]$ComposeCmd)
    
    Write-LogInfo "部署绿环境..."
    
    # 检查并清理端口冲突
    Clear-PortConflict -Port 3001
    Clear-PortConflict -Port 3002
    
    # 停止蓝环境
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.blue.yml down" 2>$null
    }
    catch {
        # 忽略错误，蓝环境可能未运行
    }
    
    # 启动绿环境（合并基础服务和绿环境配置）
    Write-LogInfo "启动绿环境服务..."
    Invoke-Expression "$ComposeCmd -f docker-compose.base.yml -f docker-compose.green.yml up -d --build"
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "绿环境启动失败"
        exit 1
    }
    
    # 等待服务健康检查
    $backendReady = Wait-ForServiceHealth -ComposeCmd $ComposeCmd -ServiceName "backend-green" -TimeoutSeconds 60
    $frontendReady = Wait-ForServiceHealth -ComposeCmd $ComposeCmd -ServiceName "frontend-green" -TimeoutSeconds 60
    
    if ($backendReady -and $frontendReady) {
        Write-LogSuccess "绿环境部署成功"
    }
    else {
        Write-LogError "绿环境部署失败 - 服务未就绪"
        exit 1
    }
}

# 切换到蓝环境
function Switch-ToBlue {
    param([string]$ComposeCmd)
    
    Write-LogInfo "切换到蓝环境..."
    
    # 更新 Nginx 配置
    Copy-Item "docker/nginx/nginx.blue.conf" "docker/nginx/nginx.conf" -Force
    
    # 重启 Nginx
    Invoke-Expression "$ComposeCmd -f docker-compose.nginx.yml up -d --force-recreate nginx"
    
    Write-LogSuccess "已切换到蓝环境"
}

# 切换到绿环境
function Switch-ToGreen {
    param([string]$ComposeCmd)
    
    Write-LogInfo "切换到绿环境..."
    
    # 更新 Nginx 配置
    Copy-Item "docker/nginx/nginx.green.conf" "docker/nginx/nginx.conf" -Force
    
    # 重启 Nginx
    Invoke-Expression "$ComposeCmd -f docker-compose.nginx.yml up -d --force-recreate nginx"
    
    Write-LogSuccess "已切换到绿环境"
}

# 启动 Nginx
function Start-Nginx {
    param([string]$ComposeCmd)
    
    Write-LogInfo "启动 Nginx 负载均衡器..."
    
    # 等待后端服务就绪
    Write-LogInfo "等待后端服务就绪..."
    Start-Sleep -Seconds 10
    
    # 启动 Nginx
    Invoke-Expression "$ComposeCmd -f docker-compose.nginx.yml up -d"
    
    if ($LASTEXITCODE -ne 0) {
        Write-LogError "Nginx 启动失败"
        exit 1
    }
    
    # 等待 Nginx 健康检查
    $nginxReady = Wait-ForServiceHealth -ComposeCmd $ComposeCmd -ServiceName "nginx" -TimeoutSeconds 30
    
    if ($nginxReady) {
        Write-LogSuccess "Nginx 启动完成"
    }
    else {
        Write-LogWarning "Nginx 启动完成，但健康检查未通过"
    }
}

# 显示状态
function Show-Status {
    param([string]$ComposeCmd)
    
    Write-LogInfo "系统状态:"
    Write-Host ""
    
    Write-Host "基础服务:" -ForegroundColor $Colors.White
    Invoke-Expression "$ComposeCmd -f docker-compose.base.yml ps"
    Write-Host ""
    
    Write-Host "蓝环境:" -ForegroundColor $Colors.White
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.blue.yml ps"
    }
    catch {
        Write-Host "未运行"
    }
    Write-Host ""
    
    Write-Host "绿环境:" -ForegroundColor $Colors.White
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.green.yml ps"
    }
    catch {
        Write-Host "未运行"
    }
    Write-Host ""
    
    Write-Host "Nginx:" -ForegroundColor $Colors.White
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.nginx.yml ps"
    }
    catch {
        Write-Host "未运行"
    }
}

# 清理所有服务
function Remove-AllServices {
    param([string]$ComposeCmd)
    
    Write-LogWarning "清理所有服务..."
    
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.blue.yml down" 2>$null
    }
    catch { }
    
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.green.yml down" 2>$null
    }
    catch { }
    
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.nginx.yml down" 2>$null
    }
    catch { }
    
    try {
        Invoke-Expression "$ComposeCmd -f docker-compose.base.yml down" 2>$null
    }
    catch { }
    
    try {
        docker network rm visitor-network 2>$null
    }
    catch { }
    
    Write-LogSuccess "清理完成"
}

# 显示帮助信息
function Show-Help {
    Write-Host "访客管理系统蓝绿部署脚本 (PowerShell版本)" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 blue                    # 部署蓝环境"
    Write-Host "  .\deploy.ps1 green                   # 部署绿环境"
    Write-Host "  .\deploy.ps1 switch blue             # 切换到蓝环境"
    Write-Host "  .\deploy.ps1 switch green            # 切换到绿环境"
    Write-Host "  .\deploy.ps1 status                  # 显示系统状态"
    Write-Host "  .\deploy.ps1 cleanup                 # 清理所有服务"
    Write-Host "  .\deploy.ps1 help                    # 显示帮助信息"
    Write-Host ""
    Write-Host "示例:" -ForegroundColor $Colors.White
    Write-Host "  .\deploy.ps1 blue                    # 首次部署蓝环境"
    Write-Host "  .\deploy.ps1 green                   # 部署新版本到绿环境"
    Write-Host "  .\deploy.ps1 switch green            # 切换流量到绿环境"
    Write-Host "  .\deploy.ps1 switch blue             # 回滚到蓝环境"
}

# 主函数
function Main {
    $ComposeCmd = Test-Dependencies
    
    switch ($Action) {
        "blue" {
            New-DockerNetwork
            Start-BaseServices -ComposeCmd $ComposeCmd
            Deploy-Blue -ComposeCmd $ComposeCmd
            Start-Nginx -ComposeCmd $ComposeCmd
            Switch-ToBlue -ComposeCmd $ComposeCmd
            Show-Status -ComposeCmd $ComposeCmd
        }
        "green" {
            New-DockerNetwork
            Start-BaseServices -ComposeCmd $ComposeCmd
            Deploy-Green -ComposeCmd $ComposeCmd
            Start-Nginx -ComposeCmd $ComposeCmd
            Switch-ToGreen -ComposeCmd $ComposeCmd
            Show-Status -ComposeCmd $ComposeCmd
        }
        "switch" {
            if ([string]::IsNullOrEmpty($Environment)) {
                Write-LogError "请指定要切换到的环境: blue 或 green"
                Write-Host "使用方法: .\deploy.ps1 switch [blue|green]"
                exit 1
            }
            
            switch ($Environment) {
                "blue" {
                    Switch-ToBlue -ComposeCmd $ComposeCmd
                }
                "green" {
                    Switch-ToGreen -ComposeCmd $ComposeCmd
                }
            }
            Show-Status -ComposeCmd $ComposeCmd
        }
        "status" {
            Show-Status -ComposeCmd $ComposeCmd
        }
        "cleanup" {
            Remove-AllServices -ComposeCmd $ComposeCmd
        }
        "help" {
            Show-Help
        }
        default {
            Show-Help
        }
    }
}

# 执行主函数
Main
