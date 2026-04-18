@echo off
echo ====================================
echo   岭南康养·灵境向导
echo ====================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo [1/3] 检查依赖包...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [2/3] 安装依赖包...
    pip install -r requirements.txt
) else (
    echo [2/3] 依赖包已安装
)

echo.
echo [3/3] 启动智能体...
echo.
echo ====================================
echo   智能体已启动！
echo   请在浏览器打开: http://localhost:5000
echo   按 Ctrl+C 停止服务
echo ====================================
echo.

python app.py
pause
