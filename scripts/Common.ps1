Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# A caller can inherit PowerShell 7's module paths. Windows PowerShell must use
# its own utility module: importing the Core module omits Get-FileHash.
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Utility\Microsoft.PowerShell.Utility.psd1') -ErrorAction Stop
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
function Get-CompanionHome {
    if ($env:CONTEXT_COMPANION_HOME) { return [IO.Path]::GetFullPath($env:CONTEXT_COMPANION_HOME) }
    return Join-Path $env:LOCALAPPDATA 'ContextCompanion'
}
function Write-Utf8([string]$Path, [string]$Text) {
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($Path)) | Out-Null
    $tmp = "$Path.$([Guid]::NewGuid().ToString('N')).tmp"
    [IO.File]::WriteAllText($tmp, $Text, $script:Utf8)
    if (Test-Path -LiteralPath $Path) { [IO.File]::Replace($tmp, $Path, [System.Management.Automation.Language.NullString]::Value) } else { [IO.File]::Move($tmp, $Path) }
}
function Read-Json([string]$Path) { return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json) }
function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$([IO.Path]::GetFileName($Exe)) exited with $LASTEXITCODE. See the installation log." }
}
function Download-Checked([string]$Url, [string]$Path, [string]$Sha256) {
    if ($Sha256 -notmatch '^[0-9a-fA-F]{64}$') { throw "No valid SHA-256 supplied for $Url" }
    if ((Test-Path -LiteralPath $Path) -and ((Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ieq $Sha256)) { return }
    $tmp = "$Path.part"; $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $tmp -TimeoutSec 300
    if ((Get-FileHash -LiteralPath $tmp -Algorithm SHA256).Hash -ine $Sha256) { Remove-Item -LiteralPath $tmp -Force; throw "Download checksum mismatch for $Url" }
    Move-Item -LiteralPath $tmp -Destination $Path -Force
}
function Get-CompanionNode([string]$HomePath) {
    $installation = Join-Path $HomePath 'installation.json'
    if (Test-Path -LiteralPath $installation) { $record = Read-Json $installation; if (Test-Path -LiteralPath $record.node) { return [string]$record.node } }
    throw 'Managed Node is not installed. Run Install.bat first.'
}
