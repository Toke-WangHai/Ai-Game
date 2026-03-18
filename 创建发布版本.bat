@echo off
chcp 65001 >nul
echo ========================================
echo    修仙重生模拟器 - 创建发布版本
echo ========================================
echo.
echo 将创建以下版本：
echo   [1] EXE电脑版 - 独立运行的Windows应用
echo   [2] 网页电脑版 (dist-pc) - 浏览器打开
echo.

cd /d "%~dp0"
node build-release.js

echo.
pause
