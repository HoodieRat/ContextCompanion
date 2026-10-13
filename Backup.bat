@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Launch.ps1" -Action backup
set "CC_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %CC_EXIT%
