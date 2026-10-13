param([ValidateSet('baseline','research','diagnostic')][string]$Suite='baseline')
. (Join-Path $PSScriptRoot 'Common.ps1')
$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'));$HomePath=Get-CompanionHome
try {$Node=Get-CompanionNode $HomePath} catch {$Node=(Get-Command node.exe -ErrorAction Stop).Source}
if ($Suite -ne 'research' -and -not (Test-Path -LiteralPath (Join-Path $AppRoot 'node_modules/typescript/package.json'))) {
    Write-Error 'The baseline parser regressions require the pinned development dependencies. Run npm ci --ignore-scripts in the application folder, then retry Run-Tests.bat. No tests were executed.'
    exit 1
}
$Log=Join-Path $AppRoot ('evidence\windows-tests-'+(Get-Date -Format yyyyMMdd-HHmmss)+'.txt')
Push-Location $AppRoot
try {
    Write-Host "Documented suite: $Suite. Default baseline is not full research/release acceptance."
    & $Node (Join-Path $AppRoot 'scripts/run-test-suite.mjs') $Suite 2>&1 | Tee-Object -FilePath $Log
    $code=$LASTEXITCODE;Write-Host "Execution log: $Log";exit $code
} finally {Pop-Location}
