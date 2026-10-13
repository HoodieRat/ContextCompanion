# Connect an MCP host

Context Companion exposes a local **stdio MCP server**. Your host app executes it, gives its tools to the selected model and returns tool results to that model. The host/model must actually use the tools; connecting alone does not guarantee retrieval or automatic prompt injection.

Codex has a managed integration. LM Studio and other hosts require their own configuration and live checks. The project's internal HTTP API is not a Streamable HTTP MCP endpoint.

## Find your paths and project ID

Install the app and register the project first. From the installation folder, with the default data home:

```powershell
$ccHome = Join-Path $env:LOCALAPPDATA 'ContextCompanion'
$ccInstall = Get-Content (Join-Path $ccHome 'installation.json') -Raw | ConvertFrom-Json
$ccStatus = & $ccInstall.node .\dist\cli.js status --home $ccHome | ConvertFrom-Json
$ccStatus.projects | Select-Object id,name
```

If you set `CONTEXT_COMPANION_HOME`, use that location for `$ccHome`. The Node command is `$ccInstall.node`; the script path is the absolute path to `dist\cli.js` in your permanent app folder. The registered ID is an application project ID, not your AI app's chat ID.

## Configuration example

For hosts using an `mcpServers` JSON configuration, adapt this example. Replace every placeholder with your own installation paths and registered project ID:

```json
{
  "mcpServers": {
    "context_companion": {
      "command": "C:\\Users\\YOUR_ACCOUNT\\AppData\\Local\\ContextCompanion\\runtime\\node-v24.21.0-win-x64\\node.exe",
      "args": [
        "C:\\ContextCompanion\\dist\\cli.js",
        "mcp",
        "--home",
        "C:\\Users\\YOUR_ACCOUNT\\AppData\\Local\\ContextCompanion",
        "--project",
        "YOUR_REGISTERED_PROJECT_ID"
      ]
    }
  }
}
```

Host schemas vary. Configure generous startup/tool timeouts where supported; the Codex configuration uses 120 seconds for startup and 90 seconds for tools. Cold and multi-variant retrieval can take several seconds.

For LM Studio, its [official MCP guide](https://lmstudio.ai/docs/app/mcp) describes editing `mcp.json` through the Program sidebar. Actual tool use depends on the model's template and the host's parser; see [LM Studio tool-use documentation](https://lmstudio.ai/docs/developer/openai-compat/tools). This repository does not yet claim a verified LM Studio chat or Flash-host workflow.

## Verify the real connection

1. Attach a small approved source with a known, nonsecret fact and index it.
2. Restart/reconnect the MCP host. Confirm `context_sources`, `context_search` and `context_read` appear.
3. Ask the agent to call `context_search` for that fact and quote the supporting excerpt and source.
4. Inspect the actual tool trace/result and compare it with the original passage. Continue the result through `context_read` if needed.
5. Confirm that the host used the intended project and source. Record missing tools, timeouts and unsupported citations as failures.

For the optional read-only Serena bridge, use another server entry with the same command/paths/project ID and replace the argument `mcp` with `serena`. It exposes supported code navigation, not editing or project activation.

## Automatic context and embeddings

MCP exposes tools for the host/agent to call. Automatic retrieval before every substantive prompt requires host orchestration; the existing hook implementation is Codex-specific. A model using Flash or a local Qwen can consume returned evidence through a compatible host, but model/provider names alone do not establish a working integration.

An LM Studio embedding endpoint supplies vectors for indexing/search. It does not connect a chat model to MCP. Both arrangements can exist independently.

Keep host configuration and application data private. Cloud models may receive excerpts supplied by their host; local storage does not make that interaction offline.
