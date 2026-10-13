[CmdletBinding()]
param([switch]$Repair, [switch]$WithBrowser, [switch]$SkipVerification, [switch]$KeywordOnly, [switch]$NoOpen)
. (Join-Path $PSScriptRoot 'Common.ps1')
$AppRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$HomePath = Get-CompanionHome
$Runtime = Join-Path $HomePath 'runtime'
$Downloads = Join-Path $HomePath 'downloads'
$Pins = Read-Json (Join-Path $AppRoot 'dependency-pins.json')
[IO.Directory]::CreateDirectory($Downloads) | Out-Null
[IO.Directory]::CreateDirectory((Join-Path $HomePath 'logs')) | Out-Null
$Log = Join-Path $HomePath ('logs\install-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.txt')
Start-Transcript -Path $Log -Force | Out-Null
try {
    if (![Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { throw 'This package targets Windows x64. No system-wide Python, Node, or AI installation is changed.' }
    if (!(Test-Path -LiteralPath (Join-Path $AppRoot 'dist\cli.js'))) { throw 'Compiled application is missing. Extract the complete release ZIP before installing.' }
    if ((Test-Path -LiteralPath (Join-Path $HomePath 'installation.json')) -and (Test-Path -LiteralPath (Join-Path $HomePath 'daemon.json'))) {
        $previous = Read-Json (Join-Path $HomePath 'installation.json')
        if (Test-Path -LiteralPath $previous.node) { & $previous.node (Join-Path $AppRoot 'dist\cli.js') stop --home $HomePath; if ($LASTEXITCODE -ne 0) { throw 'Could not stop the controller; close it before repair.' } }
        for ($i=0; $i -lt 100 -and (Test-Path -LiteralPath (Join-Path $HomePath 'daemon.lock')); $i++) { Start-Sleep -Milliseconds 200 }
        if (Test-Path -LiteralPath (Join-Path $HomePath 'daemon.lock')) { throw 'Controller lock remains. Close managed jobs before installation.' }
    }
    Write-Host 'Installing isolated Node runtime...'
    $NodeVersion = [string]$Pins.node.version
    $NodeArchive = "node-$NodeVersion-win-x64.zip"
    $Checksums = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/$NodeVersion/SHASUMS256.txt" -TimeoutSec 60).Content
    $ShaLine = @($Checksums -split "`n" | Where-Object { $_ -match ([regex]::Escape($NodeArchive) + '\s*$') })
    if ($ShaLine.Count -ne 1) { throw 'Official Node release checksum could not be resolved.' }
    $NodeHash = ($ShaLine[0].Trim() -split '\s+')[0]
    $NodeZip = Join-Path $Downloads $NodeArchive
    Download-Checked "https://nodejs.org/dist/$NodeVersion/$NodeArchive" $NodeZip $NodeHash
    $NodeRoot = Join-Path $Runtime "node-$NodeVersion-win-x64"
    if (!(Test-Path -LiteralPath (Join-Path $NodeRoot 'node.exe'))) { Expand-Archive -LiteralPath $NodeZip -DestinationPath $Runtime -Force }
    $Node = Join-Path $NodeRoot 'node.exe'
    $Npm = Join-Path $NodeRoot 'node_modules\npm\bin\npm-cli.js'
    $env:PATH = "$NodeRoot;$env:PATH"
    $env:DOCS_MCP_TELEMETRY = 'false'; $env:DO_NOT_TRACK = '1'; $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
    $env:npm_config_cache = Join-Path $HomePath 'npm-cache'
    $env:npm_config_registry = 'https://registry.npmjs.org/'
    # No package-manager output inherits API credentials from the user's development shell.
    foreach ($key in @('OPENAI_API_KEY','ANTHROPIC_API_KEY','GROK_API_KEY','XAI_API_KEY','GOOGLE_API_KEY','AZURE_OPENAI_API_KEY')) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }
    function Install-NpmRuntime([string]$Name,[string]$Package,[string]$Version) {
        $dir = Join-Path $Runtime $Name; [IO.Directory]::CreateDirectory($dir) | Out-Null
        $packageFile = Join-Path $dir 'package.json'
        $desired = @{ name="context-companion-$Name-runtime"; version='1.0.0'; private=$true; dependencies=@{}; allowScripts=@{} }
        # Reviewed install hooks for the currently locked upstream graph. Unknown
        # hooks remain blocked; never grant blanket permission to dependencies.
        if($Name -eq 'docs') {
            $desired.allowScripts=@{'@arabold/docs-mcp-server@3.2.1'=$true;'better-sqlite3@12.11.1'=$true;'tree-sitter@0.21.1'=$true;'tree-sitter-javascript@0.23.1'=$true;'tree-sitter-python@0.21.0'=$true;'tree-sitter-typescript@0.23.2'=$true}
        } elseif($Name -eq 'embeddings') {
            $desired.allowScripts=@{'onnxruntime-node@1.21.0'=$true;'sharp@0.34.5'=$true;'protobufjs@7.6.6'=$true}
        }
        $desired.dependencies[$Package] = $Version
        $change=$true
        if (Test-Path -LiteralPath $packageFile) { $current=Read-Json $packageFile; $prop=$current.dependencies.PSObject.Properties[$Package]; if($prop -and [string]$prop.Value -eq $Version){$change=$false} }
        if($change -and (Test-Path -LiteralPath (Join-Path $dir 'package-lock.json'))) { Copy-Item -LiteralPath (Join-Path $dir 'package-lock.json') -Destination (Join-Path $dir 'package-lock.previous.json') -Force; Remove-Item -LiteralPath (Join-Path $dir 'package-lock.json') -Force }
        Write-Utf8 $packageFile ($desired | ConvertTo-Json -Depth 10)
        Push-Location $dir
        try {
            if(Test-Path -LiteralPath (Join-Path $dir 'package-lock.json')) { Invoke-Checked $Node @($Npm,'ci','--no-fund','--no-audit') }
            else { Invoke-Checked $Node @($Npm,'install','--save-exact','--no-fund','--no-audit') }
            $inventory = & $Node $Npm ls --all --json
            if($LASTEXITCODE -ne 0){throw "Dependency inventory failed for $Name"}
            Write-Utf8 (Join-Path $dir 'installed-tree.json') ($inventory -join "`n")
        } finally { Pop-Location }
    }
    Install-NpmRuntime 'docs' $Pins.groundedDocs.package $Pins.groundedDocs.version
    if(!$KeywordOnly) { Install-NpmRuntime 'embeddings' $Pins.embeddings.package $Pins.embeddings.version }
    Write-Host 'Installing isolated uv and Python/Serena...'
    $UvVersion = [string]$Pins.uv.version
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/astral-sh/uv/releases/tags/$UvVersion" -Headers @{'User-Agent'='ContextCompanion-Installer'} -TimeoutSec 60
    $asset = @($release.assets | Where-Object name -eq 'uv-x86_64-pc-windows-msvc.zip')
    if ($asset.Count -ne 1) { throw 'uv Windows release asset not found.' }
    $digest = [string]$asset[0].digest
    if ($digest -notmatch '^sha256:([0-9a-fA-F]{64})$') { throw 'uv asset SHA-256 digest is missing; refusing an unchecked executable download.' }
    $UvZip=Join-Path $Downloads "uv-$UvVersion.zip"; Download-Checked $asset[0].browser_download_url $UvZip $Matches[1]
    $UvRoot=Join-Path $Runtime 'uv'; [IO.Directory]::CreateDirectory($UvRoot) | Out-Null
    Expand-Archive -LiteralPath $UvZip -DestinationPath $UvRoot -Force
    $UvExe=@(Get-ChildItem -LiteralPath $UvRoot -Filter uv.exe -Recurse | Select-Object -ExpandProperty FullName)
    if($UvExe.Count -ne 1){throw 'uv archive layout was unexpected.'};$Uv=$UvExe[0]
    $env:UV_CACHE_DIR=Join-Path $HomePath 'uv-cache';$env:UV_PYTHON_INSTALL_DIR=Join-Path $Runtime 'python';$env:UV_NO_PROGRESS='1'
    $nativePreference=$ErrorActionPreference
    try {
        $ErrorActionPreference='Continue'
        $pythonInstallOutput=@(& $Uv python install ([string]$Pins.serena.python) --no-bin --no-registry 2>&1)
        $pythonInstallExit=$LASTEXITCODE
    } finally { $ErrorActionPreference=$nativePreference }
    $pythonInstallOutput | ForEach-Object { Write-Host $_ }
    # uv can extract a valid interpreter but fail on a Windows minor-version
    # junction (astral-sh/uv#19622). Use only a tested, app-owned interpreter.
    $managedCandidates=@(Get-ChildItem -LiteralPath $env:UV_PYTHON_INSTALL_DIR -Directory | Where-Object { !$_.Attributes.HasFlag([IO.FileAttributes]::ReparsePoint) -and $_.Name -match ('^cpython-'+[regex]::Escape([string]$Pins.serena.python)+'\.\d+-windows-x86_64-none$') } | Sort-Object { [version](($_.Name -split '-')[1]) } -Descending)
    if(!$managedCandidates.Count){throw 'No app-owned managed Python interpreter was extracted.'}
    $ManagedPython=Join-Path $managedCandidates[0].FullName 'python.exe'
    $pythonVersion=& $ManagedPython -c 'import sys; print(str(sys.version_info.major)+chr(46)+str(sys.version_info.minor))'
    if($LASTEXITCODE -ne 0 -or $pythonVersion -ne [string]$Pins.serena.python){throw 'Managed Python failed its version/execution check.'}
    if($pythonInstallExit -ne 0) {
        if(($pythonInstallOutput -join "`n") -notmatch 'Missing expected target directory for Python minor version link'){throw "uv python install failed ($pythonInstallExit). See the preserved log."}
        Write-Warning 'uv minor-version junction failed; the separately executed app-owned Python is used directly. The upstream failure remains in this log.'
    }
    $Venv=Join-Path $Runtime 'serena';$Python=Join-Path $Venv 'Scripts\python.exe'
    if(!(Test-Path -LiteralPath $Python)){Invoke-Checked $Uv @('venv','--python',$ManagedPython,$Venv)}
    $Requirement = 'serena-agent @ https://github.com/oraios/serena/archive/' + $Pins.serena.commit + '.zip'
    $requirementsFile=Join-Path $Venv 'requirements.in';Write-Utf8 $requirementsFile ($Requirement+"`n")
    $lockFile=Join-Path $Venv 'requirements.lock.txt'
    $pinFile=Join-Path $Venv 'source-pin.txt'
    if(!(Test-Path -LiteralPath $lockFile) -or !(Test-Path -LiteralPath $pinFile) -or (Get-Content -LiteralPath $pinFile -Raw).Trim() -ne $Pins.serena.commit){
        Invoke-Checked $Uv @('pip','compile',$requirementsFile,'--python',$Python,'--generate-hashes','--output-file',$lockFile)
        Write-Utf8 $pinFile ([string]$Pins.serena.commit)
    }
    Invoke-Checked $Uv @('pip','sync','--python',$Python,'--require-hashes',$lockFile)
    $freeze=& $Uv pip freeze --python $Python; if($LASTEXITCODE -ne 0){throw 'Python inventory failed.'}; Write-Utf8 (Join-Path $Venv 'installed-freeze.txt') ($freeze -join "`n")
    $modelRevision=''
    if(!$KeywordOnly){
        $model = Invoke-RestMethod -Uri ('https://huggingface.co/api/models/' + $Pins.embeddings.model) -TimeoutSec 60
        $modelRevision=[string]$model.sha;if($modelRevision -notmatch '^[a-f0-9]{40}$'){throw 'Embedding model did not resolve to an immutable revision.'}
    }
    $record=@{appRoot=$AppRoot;node=$Node;python=$Python;installedAt=(Get-Date).ToUniversalTime().ToString('o');modelRevision=$modelRevision;nodeArchiveSha256=$NodeHash;uvVersion=$UvVersion;upstreamPins=$Pins}
    Write-Utf8 (Join-Path $HomePath 'installation.json') ($record | ConvertTo-Json -Depth 20)
    if($WithBrowser){
        $env:PLAYWRIGHT_BROWSERS_PATH=Join-Path $HomePath 'browsers'
        Remove-Item Env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD -ErrorAction SilentlyContinue
        Invoke-Checked $Node @((Join-Path $Runtime 'docs\node_modules\playwright\cli.js'),'install','chromium')
    }
    # The controller has no runtime npm dependencies. Check the shipped JavaScript before startup.
    Invoke-Checked $Node @('--check',(Join-Path $AppRoot 'dist\cli.js'))
    Invoke-Checked $Node @((Join-Path $AppRoot 'scripts\installation-status.mjs'),'--home',$HomePath,'--keyword-only',([string][bool]$KeywordOnly))
    Invoke-Checked $Node @((Join-Path $AppRoot 'scripts\license-inventory.mjs'),$HomePath)
    Write-Host "Installation completed. Lockfiles and inventory: $Runtime"
    Write-Host 'Review and trust project hooks inside Codex. No approval settings are bypassed.'
    if(!$SkipVerification){
        & $Node (Join-Path $AppRoot 'dist\cli.js') verify --wait --home $HomePath
        if($LASTEXITCODE -ne 0){throw 'Installation finished, but live verification did not pass. Read Activity and the saved verification report; do not treat this as a verified installation.'}
    }else{Write-Warning 'Live verification was explicitly skipped; installed is not verified.'}
    if(!$NoOpen){Invoke-Checked $Node @((Join-Path $AppRoot 'dist\cli.js'),'ui','--home',$HomePath)}
} catch { Write-Host ("INSTALLATION / VERIFICATION FAILED: " + $_.Exception.Message) -ForegroundColor Red; Write-Host "Log: $Log"; exit 1 }
finally { Stop-Transcript | Out-Null }
