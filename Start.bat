@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Launch.ps1" -Action ui
set "CC_EXIT=%ERRORLEVEL%"
if not "%CC_EXIT%"=="0" pause
exit /b %CC_EXIT%
