@echo off
cd /d "%~dp0"
echo 正在打包应用...
npx electron-builder
echo 打包完成！
pause
