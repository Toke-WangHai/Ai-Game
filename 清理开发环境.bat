@echo off
cd /d "%~dp0"
echo 正在删除开发环境不需要的文件...
rd /s /q locales
rd /s /q resources
echo 清理完成！
pause
