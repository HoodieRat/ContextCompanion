[CmdletBinding()]
param([string]$Repository='context-companion', [ValidateSet('private','public')][string]$Visibility='private')
. (Join-Path $PSScriptRoot 'Common.ps1')
$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
try {
    if($Repository -notmatch '^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$'){throw 'Use a plain repository name, not a URL or shell expression.'}
    $Gh=(Get-Command gh.exe -ErrorAction Stop).Source;$Git=(Get-Command git.exe -ErrorAction Stop).Source
    Invoke-Checked $Gh @('auth','status')
    $Login=(& $Gh api user --jq .login).Trim();if($LASTEXITCODE -ne 0 -or $Login -notmatch '^[A-Za-z0-9-]+$'){throw 'Could not determine the authenticated GitHub account.'}
    $Manifest=Read-Json (Join-Path $AppRoot 'release-manifest.json')
    foreach($entry in $Manifest.files){
        if($entry.path -match '(^|/)(\.git|node_modules|runtime|models|state\.json|installation\.json|daemon\.json|\.env)(/|$)' -or $entry.path -match '(^/|\\|(^|/)\.\.(/|$))'){throw 'Release manifest contains an unsafe publication path.'}
        $file=Join-Path $AppRoot $entry.path
        if(!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash -ine $entry.sha256){throw "Release file changed: $($entry.path). Rebuild the manifest after reviewing modifications before publishing."}
    }
    # Publish a clean staging directory, not an existing development Git working tree.
    $Stage=Join-Path (Get-CompanionHome) ('publish\'+[Guid]::NewGuid().ToString())
    [IO.Directory]::CreateDirectory($Stage) | Out-Null
    foreach($entry in $Manifest.files){$dest=Join-Path $Stage $entry.path;[IO.Directory]::CreateDirectory((Split-Path -Parent $dest)) | Out-Null;Copy-Item -LiteralPath (Join-Path $AppRoot $entry.path) -Destination $dest}
    Copy-Item -LiteralPath (Join-Path $AppRoot 'release-manifest.json') -Destination (Join-Path $Stage 'release-manifest.json')
    Push-Location $Stage
    try {
        Invoke-Checked $Git @('init','--initial-branch=main')
        $Email=(& $Git config user.email);$Name=(& $Git config user.name)
        if(!$Email){Invoke-Checked $Git @('config','user.email',"$Login@users.noreply.github.com")}
        if(!$Name){Invoke-Checked $Git @('config','user.name',$Login)}
        # This staging tree contains only checksum-verified release files; never copy the private data home.
        # The clean stage contains only reviewed manifest entries. Include the
        # specifically approved public test snapshots even though raw evidence
        # is ignored in a normal development checkout.
        Invoke-Checked $Git @('add','--force','--all')
        Invoke-Checked $Git @('commit','-m','Release Context Companion 1.1.0-rc.1')
        $remote="$Login/$Repository"
        & $Gh repo view $remote --json name 2>$null | Out-Null
        if($LASTEXITCODE -eq 0){throw "Repository $remote already exists. To avoid overwriting unrelated work, choose a new repository name or review and push the staged tree manually: $Stage"}
        Invoke-Checked $Gh @('repo','create',$remote,"--$Visibility",'--source',$Stage,'--remote','origin','--push','--description','Windows-first project-bound Codex knowledge companion: Grounded Docs, Serena, local embeddings, evidence and recovery.')
        Write-Host "Published https://github.com/$remote"
    } finally {Pop-Location}
} catch {Write-Host $_.Exception.Message -ForegroundColor Red;Write-Host 'GitHub CLI and Git must be installed and gh auth login completed locally. No token belongs in this source package.';exit 1}
