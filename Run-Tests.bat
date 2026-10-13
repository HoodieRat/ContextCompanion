@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Tests.ps1" %*
set "CC_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %CC_EXIT%
