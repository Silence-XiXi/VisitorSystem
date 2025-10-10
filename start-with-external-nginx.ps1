# 使用外部Nginx启动访客管理系统
# 此脚本将启动Docker服务但不包含Nginx容器

param(
    [Parameter(Position=0)]
    [ValidateSet("blue", "green", "both", "help")]
    [string]$Action = "help"
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

# 检查Docker是否运行
function Test-DockerRunning {
    try {
        $null = docker ps
        return $true
    }
    catch {
        return $false
    }
}

# 检查Nginx是否运行
function Test-NginxRunning {
    try {
        $processes = Get-Process -Name "nginx" -ErrorAction SilentlyContinue
        return $processes.Count -gt 0
    }
    catch {
        return $false
    }
}

# 启动基础服务
function Start-BaseServices {
    Write-LogInfo "启动基础服务 (数据库、Redis、Adminer)..."
    
    try {
        docker-compose -f docker-compose.base.yml up -d
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "基础服务启动成功"
            return $true
        }
        else {
            Write-LogError "基础服务启动失败"
            return $false
        }
    }
    catch {
        Write-LogError "启动基础服务时发生错误: $($_.Exception.Message)"
        return $false
    }
}

# 启动蓝环境
function Start-BlueEnvironment {
    Write-LogInfo "启动蓝环境..."
    
    try {
        docker-compose -f docker-compose.blue.yml up -d
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "蓝环境启动成功"
            return $true
        }
        else {
            Write-LogError "蓝环境启动失败"
            return $false
        }
    }
    catch {
        Write-LogError "启动蓝环境时发生错误: $($_.Exception.Message)"
        return $false
    }
}

# 启动绿环境
function Start-GreenEnvironment {
    Write-LogInfo "启动绿环境..."
    
    try {
        docker-compose -f docker-compose.green.yml up -d
        if ($LASTEXITCODE -eq 0) {
            Write-LogSuccess "绿环境启动成功"
            return $true
        }
        else {
            Write-LogError "绿环境启动失败"
            return $false
        }
    }
    catch {
        Write-LogError "启动绿环境时发生错误: $($_.Exception.Message)"
        return $false
    }
}

# 检查服务状态
function Test-ServiceStatus {
    Write-LogInfo "检查服务状态..."
    
    $services = @(
        @{Name="PostgreSQL"; Port=5432},
        @{Name="Redis"; Port=6379},
        @{Name="Adminer"; Port=8080},
        @{Name="蓝环境后端"; Port=3001},
        @{Name="蓝环境前端"; Port=3002},
        @{Name="绿环境后端"; Port=3003},
        @{Name="绿环境前端"; Port=3004}
    )
    
    $allHealthy = $true
    
    foreach ($service in $services) {
        try {
            $connection = New-Object System.Net.Sockets.TcpClient
            $connection.Connect("localhost", $service.Port)
            $connection.Close()
            Write-Host "  ✓ $($service.Name) (端口 $($service.Port))" -ForegroundColor $Colors.Green
        }
        catch {
            Write-Host "  ✗ $($service.Name) (端口 $($service.Port))" -ForegroundColor $Colors.Red
            $allHealthy = $false
        }
    }
    
    return $allHealthy
}

# 显示帮助
function Show-Help {
    Write-Host "访客管理系统 - 外部Nginx启动脚本" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor $Colors.White
    Write-Host "  .\start-with-external-nginx.ps1 blue     # 启动蓝环境"
    Write-Host "  .\start-with-external-nginx.ps1 green    # 启动绿环境"
    Write-Host "  .\start-with-external-nginx.ps1 both     # 启动两个环境"
    Write-Host "  .\start-with-external-nginx.ps1 help     # 显示帮助"
    Write-Host ""
    Write-Host "前提条件:" -ForegroundColor $Colors.White
    Write-Host "  1. Docker Desktop 已安装并运行"
    Write-Host "  2. 外部Nginx 已安装并配置"
    Write-Host "  3. nginx-external.conf 已部署到Nginx配置目录"
    Write-Host ""
    Write-Host "访问地址:" -ForegroundColor $Colors.White
    Write-Host "  http://localhost - 通过外部Nginx访问"
    Write-Host "  http://localhost:3001 - 直接访问蓝环境后端"
    Write-Host "  http://localhost:3002 - 直接访问蓝环境前端"
    Write-Host "  http://localhost:3003 - 直接访问绿环境后端"
    Write-Host "  http://localhost:3004 - 直接访问绿环境前端"
}

# 主函数
function Main {
    # 检查Docker是否运行
    if (-not (Test-DockerRunning)) {
        Write-LogError "Docker未运行，请先启动Docker Desktop"
        exit 1
    }
    
    # 检查Nginx是否运行
    if (-not (Test-NginxRunning)) {
        Write-LogWarning "外部Nginx未运行，请先启动Nginx服务"
        Write-LogInfo "Windows: C:\nginx\nginx.exe"
        Write-LogInfo "Linux: sudo systemctl start nginx"
    }
    
    switch ($Action) {
        "blue" {
            Write-LogInfo "启动蓝环境模式..."
            
            if (Start-BaseServices) {
                Start-Sleep -Seconds 5
                if (Start-BlueEnvironment) {
                    Start-Sleep -Seconds 10
                    if (Test-ServiceStatus) {
                        Write-LogSuccess "蓝环境启动完成！"
                        Write-LogInfo "访问地址: http://localhost"
                    }
                    else {
                        Write-LogWarning "部分服务可能未完全启动，请检查日志"
                    }
                }
            }
        }
        "green" {
            Write-LogInfo "启动绿环境模式..."
            
            if (Start-BaseServices) {
                Start-Sleep -Seconds 5
                if (Start-GreenEnvironment) {
                    Start-Sleep -Seconds 10
                    if (Test-ServiceStatus) {
                        Write-LogSuccess "绿环境启动完成！"
                        Write-LogInfo "访问地址: http://localhost"
                    }
                    else {
                        Write-LogWarning "部分服务可能未完全启动，请检查日志"
                    }
                }
            }
        }
        "both" {
            Write-LogInfo "启动双环境模式..."
            
            if (Start-BaseServices) {
                Start-Sleep -Seconds 5
                if (Start-BlueEnvironment) {
                    Start-Sleep -Seconds 5
                    if (Start-GreenEnvironment) {
                        Start-Sleep -Seconds 10
                        if (Test-ServiceStatus) {
                            Write-LogSuccess "双环境启动完成！"
                            Write-LogInfo "访问地址: http://localhost"
                            Write-LogInfo "使用 .\switch-nginx-env.ps1 切换环境"
                        }
                        else {
                            Write-LogWarning "部分服务可能未完全启动，请检查日志"
                        }
                    }
                }
            }
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
