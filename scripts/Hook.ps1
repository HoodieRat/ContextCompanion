param([Parameter(Mandatory=$true)][string]$NodePath,[Parameter(Mandatory=$true)][string]$AppRoot,[Parameter(Mandatory=$true)][string]$HomePath,[Parameter(Mandatory=$true)][string]$ProjectId)
$ErrorActionPreference='Stop'
$utf8=New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding=$utf8;[Console]::OutputEncoding=$utf8;$OutputEncoding=$utf8
$hookTrace=[ordered]@{projectId=$ProjectId;pid=$PID}
function Get-HookHash([string]$Value) {
    $digest=[Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($digest.ComputeHash([Text.Encoding]::UTF8.GetBytes($Value)))).Replace('-','').ToLowerInvariant() }
    finally { $digest.Dispose() }
}
function Write-HookTrace([string]$Stage) {
    # Diagnostics must never alter the hook protocol or retain source text/input.
    try {
        $row=[ordered]@{at=[DateTime]::UtcNow.ToString('o');stage=$Stage}
        foreach($key in $hookTrace.Keys){$row[$key]=$hookTrace[$key]}
        $traceDirectory=Join-Path $HomePath 'logs'
        [IO.Directory]::CreateDirectory($traceDirectory) | Out-Null
        [IO.File]::AppendAllText((Join-Path $traceDirectory 'hook-process.jsonl'),(($row|ConvertTo-Json -Compress)+"`n"),$utf8)
    } catch { }
}
function ConvertTo-NativeArgument([string]$Value) {
    $quoted=[regex]::Replace($Value,'(\\*)"','$1$1\"')
    $quoted=[regex]::Replace($quoted,'(\\+)$','$1$1')
    return '"'+$quoted+'"'
}
Write-HookTrace 'wrapper-start'
$nativeProcess=$null
try {
    $payload=[Console]::In.ReadToEnd()
    if([Text.Encoding]::UTF8.GetByteCount($payload) -gt 2097152){throw 'Hook input exceeded 2 MiB.'}
    try {
        $inputValue=$payload|ConvertFrom-Json
        if($inputValue.hook_event_name -in @('SessionStart','UserPromptSubmit')){$hookTrace.event=[string]$inputValue.hook_event_name}
        if($inputValue.session_id){$hookTrace.sessionHash=Get-HookHash ([string]$inputValue.session_id)}
        if($inputValue.turn_id){$hookTrace.turnHash=Get-HookHash ([string]$inputValue.turn_id)}
        if($inputValue.prompt){$hookTrace.queryHash=Get-HookHash ([string]$inputValue.prompt).Trim()}
    } catch { $hookTrace.inputJsonValid=$false }
    Write-HookTrace 'input-received'
    # Windows PowerShell can encode a native pipeline as ASCII despite the
    # console encoding. Write UTF-8 bytes directly so prompt/audit hashes agree.
    $startInfo=New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName=$NodePath
    $startInfo.Arguments=(@((Join-Path $AppRoot 'dist\cli.js'),'hook','--home',$HomePath,'--project',$ProjectId)|ForEach-Object {ConvertTo-NativeArgument $_}) -join ' '
    $startInfo.UseShellExecute=$false;$startInfo.CreateNoWindow=$true
    $startInfo.RedirectStandardInput=$true;$startInfo.RedirectStandardOutput=$true;$startInfo.RedirectStandardError=$true
    $startInfo.StandardOutputEncoding=$utf8;$startInfo.StandardErrorEncoding=$utf8
    $nativeProcess=New-Object Diagnostics.Process
    $nativeProcess.StartInfo=$startInfo
    $nativeProcess.Start() | Out-Null
    $outputTask=$nativeProcess.StandardOutput.ReadToEndAsync()
    $errorTask=$nativeProcess.StandardError.ReadToEndAsync()
    $inputBytes=$utf8.GetBytes($payload)
    $nativeProcess.StandardInput.BaseStream.Write($inputBytes,0,$inputBytes.Length)
    $nativeProcess.StandardInput.Close()
    $nativeProcess.WaitForExit()
    $nativeOutput=$outputTask.GetAwaiter().GetResult()
    $nativeError=$errorTask.GetAwaiter().GetResult()
    $hookTrace.nodeExitCode=$nativeProcess.ExitCode
    $hookTrace.outputHash=Get-HookHash $nativeOutput
    try {
        $outputValue=$nativeOutput|ConvertFrom-Json
        if($outputValue.hookSpecificOutput.additionalContext){$hookTrace.contextHash=Get-HookHash ([string]$outputValue.hookSpecificOutput.additionalContext)}
        $hookTrace.hasSystemMessage=[bool]$outputValue.systemMessage
    } catch { $hookTrace.outputJsonValid=$false }
    Write-HookTrace 'node-completed'
    [Console]::Out.Write($nativeOutput)
    [Console]::Error.Write($nativeError)
    if($nativeProcess.ExitCode -ne 0){throw "Hook process exited $($nativeProcess.ExitCode)"}
} catch { Write-HookTrace 'wrapper-failed'; [Console]::Out.WriteLine((@{systemMessage=('Context Companion could not inject context: '+$_.Exception.Message)} | ConvertTo-Json -Compress)); exit 0 }
finally { if($nativeProcess){$nativeProcess.Dispose()} }
