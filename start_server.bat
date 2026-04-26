@echo off
chcp 65001 >nul
echo ========================================
echo   封样件及色板接收登记管理系统
echo   正在安装依赖并启动服务...
echo ========================================
cd /d "%~dp0"
pip install -r requirements.txt -q
echo.
echo 依赖安装完成，正在启动Flask服务器...
echo.
echo 访问地址: http://127.0.0.1:5000
echo 按 Ctrl+C 停止服务器
echo ========================================
python app.py
pause
