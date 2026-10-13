param([ValidateSet('baseline','research','diagnostic')][string]$Suite='baseline')
. (Join-Path $PSScriptRoot 'Common.ps1')
$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'));$HomePath=Get-CompanionHome
try {$Node=Get-CompanionNode $HomePath} catch {$Node=(Get-Command node.exe -ErrorAction Stop).Source}
$Log=Join-Path $AppRoot ('evidence\windows-tests-'+(Get-Date -Format yyyyMMdd-HHmmss)+'.txt')
Push-Location $AppRoot
try {
    Write-Host "Documented suite: $Suite. Default baseline is not full research/release acceptance."
    & $Node (Join-Path $AppRoot 'scripts/run-test-suite.mjs') $Suite 2>&1 | Tee-Object -FilePath $Log
    $code=$LASTEXITCODE;Write-Host "Execution log: $Log";exit $code
} finally {Pop-Location}
