@echo off
chcp 65001 >nul
title 本地服务器
color 0A

echo   正在启动本地HTTP服务器
echo.

REM 检查是否安装了Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [✓] 检测到Python
) else (
    echo [✗] 未检测到Python
    echo 可以从 https://python.org 下载安装
    pause
    exit /b 1
)

REM 使用当前目录，而不是完整路径
cd /d "%~dp0"
echo 当前工作目录: %cd%
echo.

REM 列出当前目录下的HTML文件
echo 当前目录下的HTML文件:
dir *.html 2>nul || echo (没有找到HTML文件)
echo.

REM 检查index.html文件是否存在
if exist "index.html" (
    echo [✓] 找到 index.html 文件
) else (
    echo [✗] 未找到 index.html 文件
    echo 将显示目录列表而不是具体页面
    echo 请确保 index.html 文件在当前目录中
    echo.
)

REM 设置端口
set PORT=8000
:port_check
netstat -ano | findstr ":%PORT%" >nul
if %errorlevel% equ 0 (
    echo 端口 %PORT% 已被占用，尝试端口 %PORT%+1
    set /a PORT+=1
    goto port_check
)

echo 启动服务器在端口 %PORT% ...
echo 按 Ctrl+C 停止服务器
echo.
echo 正在浏览器中打开页面...
echo.

REM 等待2秒再打开浏览器，给服务器启动时间
timeout /t 1 /nobreak >nul

REM 打开浏览器
start "" "http://localhost:%PORT%/"

REM 启动Python服务器（简化版本）
python -m http.server %PORT%