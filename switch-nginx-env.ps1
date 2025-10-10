# Nginx环境切换脚本
# 用于在蓝绿环境之间切换外部Nginx配置

param(
    [Parameter(Position=0)]
    [ValidateSet("blue", "green", "status", "help")]
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

# 检查端口占用
function Test-PortInUse {
    param([int]$Port)
    
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# 切换到蓝环境
function Switch-ToBlue {
    Write-LogInfo "切换到蓝环境..."
    
    # 检查蓝环境服务是否运行
    if (-not (Test-PortInUse -Port 3001)) {
        Write-LogError "蓝环境后端服务未运行 (端口3001)"
        return $false
    }
    
    if (-not (Test-PortInUse -Port 3002)) {
        Write-LogError "蓝环境前端服务未运行 (端口3002)"
        return $false
    }
    
    # 更新Nginx配置
    $configPath = "nginx-external.conf"
    if (Test-Path $configPath) {
        $content = Get-Content $configPath -Raw
        
        # 替换当前环境配置
        $content = $content -replace "server 127\.0\.0\.1:3001;", "server 127.0.0.1:3001; # 蓝环境后端"
        $content = $content -replace "server 127\.0\.0\.1:3003;", "server 127.0.0.1:3003; # 绿环境后端"
        $content = $content -replace "server 127\.0\.0\.1:3002;", "server 127.0.0.1:3002; # 蓝环境前端"
        $content = $content -replace "server 127\.0\.0\.1:3004;", "server 127.0.0.1:3004; # 绿环境前端"
        
        # 更新当前环境指向
        $content = $content -replace "upstream current_backend \{[^}]*\}", "upstream current_backend {`n        server 127.0.0.1:3001; # 蓝环境`n        keepalive 32;`n    }"
        $content = $content -replace "upstream current_frontend \{[^}]*\}", "upstream current_frontend {`n        server 127.0.0.1:3002; # 蓝环境`n        keepalive 32;`n    }"
        
        Set-Content -Path $configPath -Value $content -Encoding UTF8
        Write-LogSuccess "Nginx配置已更新为蓝环境"
    }
    else {
        Write-LogError "Nginx配置文件不存在: $configPath"
        return $false
    }
    
    # 重新加载Nginx配置
    if (Test-NginxRunning) {
        Write-LogInfo "重新加载Nginx配置..."
        try {
            # Windows下重新加载Nginx
            nginx -s reload
            Write-LogSuccess "Nginx配置重新加载成功"
        }
        catch {
            Write-LogWarning "无法重新加载Nginx配置，请手动重启Nginx服务"
        }
    }
    else {
        Write-LogWarning "Nginx未运行，请先启动Nginx服务"
    }
    
    return $true
}

# 切换到绿环境
function Switch-ToGreen {
    Write-LogInfo "切换到绿环境..."
    
    # 检查绿环境服务是否运行
    if (-not (Test-PortInUse -Port 3003)) {
        Write-LogError "绿环境后端服务未运行 (端口3003)"
        return $false
    }
    
    if (-not (Test-PortInUse -Port 3004)) {
        Write-LogError "绿环境前端服务未运行 (端口3004)"
        return $false
    }
    
    # 更新Nginx配置
    $configPath = "nginx-external.conf"
    if (Test-Path $configPath) {
        $content = Get-Content $configPath -Raw
        
        # 更新当前环境指向绿环境
        $content = $content -replace "upstream current_backend \{[^}]*\}", "upstream current_backend {`n        server 127.0.0.1:3003; # 绿环境`n        keepalive 32;`n    }"
        $content = $content -replace "upstream current_frontend \{[^}]*\}", "upstream current_frontend {`n        server 127.0.0.1:3004; # 绿环境`n        keepalive 32;`n    }"
        
        Set-Content -Path $configPath -Value $content -Encoding UTF8
        Write-LogSuccess "Nginx配置已更新为绿环境"
    }
    else {
        Write-LogError "Nginx配置文件不存在: $configPath"
        return $false
    }
    
    # 重新加载Nginx配置
    if (Test-NginxRunning) {
        Write-LogInfo "重新加载Nginx配置..."
        try {
            nginx -s reload
            Write-LogSuccess "Nginx配置重新加载成功"
        }
        catch {
            Write-LogWarning "无法重新加载Nginx配置，请手动重启Nginx服务"
        }
    }
    else {
        Write-LogWarning "Nginx未运行，请先启动Nginx服务"
    }
    
    return $true
}

# 显示状态
function Show-Status {
    Write-LogInfo "系统状态:"
    Write-Host ""
    
    # 检查Nginx状态
    if (Test-NginxRunning) {
        Write-Host "Nginx服务: " -NoNewline
        Write-Host "运行中" -ForegroundColor $Colors.Green
    }
    else {
        Write-Host "Nginx服务: " -NoNewline
        Write-Host "未运行" -ForegroundColor $Colors.Red
    }
    
    # 检查端口状态
    Write-Host ""
    Write-Host "端口状态:" -ForegroundColor $Colors.White
    
    $ports = @(
        @{Port=80; Name="Nginx主入口"; Required=$true},
        @{Port=3001; Name="蓝环境后端"; Required=$false},
        @{Port=3002; Name="蓝环境前端"; Required=$false},
        @{Port=3003; Name="绿环境后端"; Required=$false},
        @{Port=3004; Name="绿环境前端"; Required=$false}
    )
    
    foreach ($portInfo in $ports) {
        $status = if (Test-PortInUse -Port $portInfo.Port) { "运行中" } else { "未运行" }
        $color = if (Test-PortInUse -Port $portInfo.Port) { $Colors.Green } else { $Colors.Red }
        
        Write-Host "  端口 $($portInfo.Port) ($($portInfo.Name)): " -NoNewline
        Write-Host $status -ForegroundColor $color
    }
    
    # 检查当前环境
    Write-Host ""
    Write-Host "当前环境检测:" -ForegroundColor $Colors.White
    
    if ((Test-PortInUse -Port 3001) -and (Test-PortInUse -Port 3002)) {
        Write-Host "  蓝环境: " -NoNewline
        Write-Host "可用" -ForegroundColor $Colors.Green
    }
    else {
        Write-Host "  蓝环境: " -NoNewline
        Write-Host "不可用" -ForegroundColor $Colors.Red
    }
    
    if ((Test-PortInUse -Port 3003) -and (Test-PortInUse -Port 3004)) {
        Write-Host "  绿环境: " -NoNewline
        Write-Host "可用" -ForegroundColor $Colors.Green
    }
    else {
        Write-Host "  绿环境: " -NoNewline
        Write-Host "不可用" -ForegroundColor $Colors.Red
    }
}

# 显示帮助
function Show-Help {
    Write-Host "Nginx环境切换脚本" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "使用方法:" -ForegroundColor $Colors.White
    Write-Host "  .\switch-nginx-env.ps1 blue     # 切换到蓝环境"
    Write-Host "  .\switch-nginx-env.ps1 green    # 切换到绿环境"
    Write-Host "  .\switch-nginx-env.ps1 status   # 显示系统状态"
    Write-Host "  .\switch-nginx-env.ps1 help     # 显示帮助信息"
    Write-Host ""
    Write-Host "前提条件:" -ForegroundColor $Colors.White
    Write-Host "  1. 安装Nginx服务"
    Write-Host "  2. 将nginx-external.conf复制到Nginx配置目录"
    Write-Host "  3. 启动Docker容器服务"
}

# 主函数
function Main {
    switch ($Action) {
        "blue" {
            if (Switch-ToBlue) {
                Write-LogSuccess "已切换到蓝环境"
            }
            else {
                Write-LogError "切换到蓝环境失败"
            }
        }
        "green" {
            if (Switch-ToGreen) {
                Write-LogSuccess "已切换到绿环境"
            }
            else {
                Write-LogError "切换到绿环境失败"
            }
        }
        "status" {
            Show-Status
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
