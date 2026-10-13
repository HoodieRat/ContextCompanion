[CmdletBinding()]
param([string]$Action='ui', [string]$BackupId='')
. (Join-Path $PSScriptRoot 'Common.ps1')
try {
    $HomePath=Get-CompanionHome;$Node=Get-CompanionNode $HomePath;$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $env:PATH=(Split-Path -Parent $Node)+';'+$env:PATH
    $Arguments=@((Join-Path $AppRoot 'dist\cli.js'),$Action,'--home',$HomePath)
    if($Action -eq 'verify'){$Arguments+='--wait'}
    if($Action -eq 'restore'){if(!$BackupId){$BackupId=Read-Host 'Backup ID (from Settings or backups command)'};$Arguments+=@('--backup',$BackupId)}
    if($Action -eq 'doctor'){
        [IO.Directory]::CreateDirectory((Join-Path $HomePath 'logs')) | Out-Null
        $Log=Join-Path $HomePath ('logs\diagnostics-'+(Get-Date -Format yyyyMMdd-HHmmss)+'.txt')
        & $Node @Arguments 2>&1 | Tee-Object -FilePath $Log
        if($LASTEXITCODE -ne 0){throw "Diagnostics failed. Report: $Log"};Write-Host "Report: $Log"
    }else{Invoke-Checked $Node $Arguments}
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
