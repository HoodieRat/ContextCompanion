[CmdletBinding()]
param([switch]$RemoveRuntimes)
. (Join-Path $PSScriptRoot 'Common.ps1')
$HomePath=Get-CompanionHome;$Node=Get-CompanionNode $HomePath;$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    Invoke-Checked $Node @((Join-Path $AppRoot 'dist\cli.js'),'unlink-all','--home',$HomePath)
    Invoke-Checked $Node @((Join-Path $AppRoot 'dist\cli.js'),'stop','--home',$HomePath)
    for($i=0;$i -lt 150 -and (Test-Path -LiteralPath (Join-Path $HomePath 'daemon.lock'));$i++){Start-Sleep -Milliseconds 200}
    if(Test-Path -LiteralPath (Join-Path $HomePath 'daemon.lock')){throw 'Managed processes have not stopped. Runtime files were not removed.'}
    if($RemoveRuntimes){Remove-Item -LiteralPath (Join-Path $HomePath 'runtime') -Recurse -Force;Remove-Item -LiteralPath (Join-Path $HomePath 'installation.json') -Force}
    Write-Host 'Managed project integrations removed. Project code, user settings outside managed blocks, indexes, memory and backups were retained.'
    Write-Host "Private retained data: $HomePath"
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;exit 1}
