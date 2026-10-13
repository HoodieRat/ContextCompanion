@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Publish-GitHub.ps1" %*
set "CC_EXIT=%ERRORLEVEL%"
pause
exit /b %CC_EXIT%
