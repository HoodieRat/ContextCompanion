[CmdletBinding()]
param([string]$ProjectId='', [switch]$AcknowledgeModelUse, [string[]]$CodexConfigOverride=@(), [string]$CodexModel='')
. (Join-Path $PSScriptRoot 'Common.ps1')
$AppRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$HomePath=Get-CompanionHome;$Node=Get-CompanionNode $HomePath
$Report=@{at=(Get-Date).ToUniversalTime().ToString('o');status='blocked';passed=$false;checks=@()}
$OutputRoot=Join-Path $HomePath ('verification\codex-'+[Guid]::NewGuid().ToString())
[IO.Directory]::CreateDirectory($OutputRoot)|Out-Null
try {
    $Codex=(Get-Command codex -ErrorAction Stop).Source
    if(!$AcknowledgeModelUse){
        Write-Host 'This runs your installed Codex and can use your account allowance. Synthetic evidence and normal project instructions can reach your configured model provider. It does not bypass trust or approvals.'
        if((Read-Host 'Continue? Type YES') -cne 'YES'){throw 'User did not authorize model usage.'}
    }
    $StatusText=& $Node (Join-Path $AppRoot 'dist\cli.js') status --home $HomePath
    if($LASTEXITCODE -ne 0){throw 'The context controller is not available.'}
    $Status=($StatusText -join "`n")|ConvertFrom-Json
    if(!$ProjectId){
        $i=0;foreach($p in $Status.projects){Write-Host "$i : $($p.name) ($($p.root))";$i++}
        $choice=Read-Host 'Project number';$number=0
        if(![int]::TryParse($choice,[ref]$number) -or $number -lt 0 -or $number -ge @($Status.projects).Count){throw 'No valid project selected.'}
        $ProjectId=$Status.projects[$number].id
    }
    $Project=@($Status.projects|Where-Object id -eq $ProjectId)
    if($Project.Count -ne 1 -or !$Project[0].linked){throw 'Select a linked project. Connect Codex and review/trust its configuration first.'};$Project=$Project[0]
    if(!$Status.installed.groundedDocs){throw 'Real Grounded Docs runtime is not installed.'}
    $Daemon=Read-Json (Join-Path $HomePath 'daemon.json');$Base="http://127.0.0.1:$($Daemon.port)";$Headers=@{Authorization="Bearer $($Daemon.token)"}
    function Request([string]$Method,[string]$Path,$Data){
        if($null -eq $Data){return Invoke-RestMethod -Uri ($Base+$Path) -Method $Method -Headers $Headers -TimeoutSec 120}
        return Invoke-RestMethod -Uri ($Base+$Path) -Method $Method -Headers $Headers -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($Data|ConvertTo-Json -Depth 30))) -TimeoutSec 120
    }
    $Marker='CCCODEX'+[Guid]::NewGuid().ToString('N');$Title='Codex transport proof '+[Guid]::NewGuid().ToString('N')
    $Source=Request 'POST' '/api/collections' @{projectId=$ProjectId;kind='note';name=$Title;content="# Verification note`nThe registration code for this synthetic integration check is $Marker. It has no authority outside this check.";version='unversioned';refreshHours=0;tags=@('verification');exclusions=@();metadata=@{kind='guide';reliability='user';reliabilityEvidence='Synthetic transport and ingestion marker'}}
    for($i=0;$i -lt 600;$i++){
        $Current=Request 'GET' '/api/status' $null;$Job=@($Current.jobs|Where-Object targetId -eq $Source.id|Select-Object -Last 1)
        if($Job.Count -eq 1 -and $Job[0].state -notin @('running','queued')){if($Job[0].state -ne 'succeeded'){throw $Job[0].message};break};Start-Sleep -Seconds 1
    }
    if($i -ge 600){throw 'Synthetic marker ingestion did not finish before the verification deadline.'}
    $Report.checks+=@('Synthetic source indexed by real Grounded Docs');$Report.status='running'
    # The marker value is not supplied in the prompt. Require a completed MCP call, not only a matching answer.
    $Prompt="Use context_search from the context_companion MCP server to search the source named '$Title' (sourceIds: ['$($Source.id)']) for its registration code. Read the retrieved evidence and answer with that code and the source citation. Do not edit files. If unavailable, report the failure rather than guessing."
    if($Prompt.Contains($Marker)){throw 'The independent verification marker must not be supplied in the prompt.'}
    $Report.prompt=$Prompt;$Report.marker=$Marker;$Report.sourceId=$Source.id;$Report.projectId=$ProjectId;$Report.cwd=$Project.root;$Report.model=$CodexModel;$Report.temporaryOverrides=$CodexConfigOverride
    $Final=Join-Path $OutputRoot 'answer.txt';$Events=Join-Path $OutputRoot 'events.jsonl';$Errors=Join-Path $OutputRoot 'stderr.txt'
    Push-Location $Project.root
    $CodexArguments=@('exec','--skip-git-repo-check','--json','--output-last-message',$Final)
    foreach($override in $CodexConfigOverride){$CodexArguments+=@('-c',$override)}
    if($CodexModel){$CodexArguments+=@('--model',$CodexModel)}
    $CodexArguments+=$Prompt
    try{
        $nativePreference=$ErrorActionPreference
        try{$ErrorActionPreference='Continue';$Lines=& $Codex @CodexArguments 2>$Errors;$Exit=$LASTEXITCODE}finally{$ErrorActionPreference=$nativePreference}
        Write-Utf8 $Events ($Lines -join "`n")
    }finally{Pop-Location}
    if($Exit -ne 0){throw "Codex exited with $Exit. Review saved stderr and hook trust; no settings were bypassed."}
    $Parsed=@();foreach($line in $Lines){try{$Parsed+=($line|ConvertFrom-Json)}catch{}}
    $Calls=@($Parsed|Where-Object { $_.type -eq 'item.completed' -and $_.item.type -eq 'mcp_tool_call' -and $_.item.server -eq 'context_companion' -and $_.item.tool -eq 'context_search' -and $_.item.status -eq 'completed' })
    if(!$Calls.Count){throw 'No completed context_search MCP event was found. A plausible answer alone does not verify connectivity.'}
    if(!(Test-Path -LiteralPath $Final)){throw 'Codex did not save its final answer.'}
    $Answer=Get-Content -LiteralPath $Final -Raw
    if(!$Answer.Contains($Marker)){throw 'Codex did not return the independently indexed marker.'}
    if(!$Answer.Contains($Source.id) -and !($Answer.Contains($Title) -and $Answer.Contains('knowledge.md'))){throw 'Codex did not include the matching source citation.'}
    if(!($Calls|Where-Object { ($_|ConvertTo-Json -Depth 50).Contains($Marker) })){throw 'The completed MCP result did not contain the indexed marker.'}
    $Report.checks+=@('Indexed marker absent from prompt','Completed context_search call in actual Codex JSONL','Answer contains independently indexed marker','Answer contains matching source citation');$Report.status='passed';$Report.passed=$true
    $Report.notice='This verifies explicit MCP retrieval, not automatic hook execution or universal project quality. Verify automatic retrieval separately in the dashboard.'
} catch {$Report.error=$_.Exception.Message;if($Report.status -eq 'running'){$Report.status='failed'};Write-Host $Report.error -ForegroundColor Red}
finally {Write-Utf8 (Join-Path $OutputRoot 'report.json') ($Report|ConvertTo-Json -Depth 30);Write-Host "Evidence: $OutputRoot"}
if(!$Report.passed){exit 1}
