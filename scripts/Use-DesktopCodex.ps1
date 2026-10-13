[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Executable)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Common.ps1')
$Executable=[IO.Path]::GetFullPath($Executable)
if(!(Test-Path -LiteralPath $Executable -PathType Leaf)){throw 'Verified desktop Codex executable is missing.'}
$bin=Join-Path $env:APPDATA 'npm'
$backup=Join-Path (Get-CompanionHome) 'verification\targeted-fixes\path-launchers-before'
[IO.Directory]::CreateDirectory($backup)|Out-Null
$ps=@'
# Context Companion compatibility repair: use the installed desktop Codex runtime.
$codexExecutable='__EXE__'
if($MyInvocation.ExpectingInput){$input | & $codexExecutable @args}else{& $codexExecutable @args}
exit $LASTEXITCODE
'@
$files=@{'codex.ps1'=$ps.Replace('__EXE__',$Executable.Replace("'","''"));'codex.cmd'="@echo off`r`n`"$Executable`" %*`r`n";'codex'="#!/bin/sh`nexec '$($Executable.Replace('\','/'))' `"`$@`"`n"}
foreach($name in $files.Keys){
 $target=Join-Path $bin $name;$saved=Join-Path $backup $name
 if(!(Test-Path -LiteralPath $target -PathType Leaf)){throw "Existing PATH launcher missing: $name"}
 if(!(Test-Path -LiteralPath $saved)){Copy-Item -LiteralPath $target -Destination $saved}
 Write-Utf8 $target $files[$name]
}
Write-Host "PATH launchers now use $Executable. Original launchers: $backup"
