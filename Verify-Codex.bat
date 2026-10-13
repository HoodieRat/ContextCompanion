@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Verify-Codex.ps1" %*
set "CC_EXIT=%ERRORLEVEL%"
if errorlevel 1 echo Verification did not pass. Read the recorded report.
pause
exit /b %CC_EXIT%
