# Context Companion

**Keep the documentation your project needs current, and give your AI agent relevant passages with citations.**

Context Companion is a Windows-first, local documentation and engineering-context service for existing projects. It collects references from sources you choose, indexes them through Grounded Docs, and exposes project-bound search, reading and memory tools through the Model Context Protocol (MCP).

Your AI app chooses the model. Context Companion supplies reference material. The existing Codex integration also attempts automatic context delivery at session start and before substantive prompts. Other compatible MCP hosts can connect to the same tools; their configuration, tool calling and automatic delivery must be verified separately.

**Status: 1.1.0-rc.1, beta/release candidate. Full release acceptance remains FAIL.** Features are frozen; repairs to the existing workflow continue. Current code passes 195/195 baseline and 233/233 diagnostic tests. The keyword lifecycle failure now passes its unchanged 3/3 replay; broader release gates are being verified. The unchanged documentation protocol now passes 12/12 as a known-regression replay; its original 9/12 failure is preserved. Fresh runtime delivery and one actual reused GUI turn have matching packet receipts. Unseen retrieval and reliability gates remain open. See [verification results](docs/TEST_RESULTS.md) and [current status and limitations](docs/PUBLIC_STATUS.md).

## What "refreshing context" means

Context Companion keeps a searchable documentation library for each project. You approve the documentation URLs, repositories or local files. It gathers and indexes that material, refreshes enabled sources at your chosen interval, and supplies relevant excerpts and citations to your AI agent when you work.

A refresh updates the stored documentation. A chat request retrieves selected evidence from that library. The 24-hour schedule is for source updates; context delivery can happen on each substantive prompt through the Codex hooks, or through an explicit MCP search.

### How version requirements are used

The project profile can read supported dependency manifests and lockfiles, distinguishing declared requirements from resolved versions. You can review or supply the profile manually. Retrieval compares the required library/version, language and platform with the source's metadata. Unresolved or conflicting versions need clarification; a declared compatibility range is not a runtime test.

You still select the source to gather: a version-specific documentation URL, repository tag/commit or approved local folder. Labelling a source with a version does not change its URL or prove its contents match. Refreshing a pinned commit keeps that commit pinned. Finding additional primary documentation is work the AI agent can do with its research tools; saving a finding does not automatically attach or crawl its URL.

For example, a team maintaining a Python 3.12 service can attach the official documentation for that version and its local architecture guides. When investigating a queue or threading API, the agent can retrieve the matching reference and cite the original passage. A documentation refresh keeps those selected sources current while preserving the team's version requirement. It does not upgrade the project to a newer Python release.

## What it does

- Collects approved public documentation websites, public HTTPS Git repositories, local folders/files, uploaded documents and pasted notes.
- Refreshes enabled sources on a schedule while the controller runs.
- Uses Grounded Docs conversion, structural indexing, keyword search and optional embedding-based semantic retrieval.
- Reads supported project manifests/lockfiles and filters sources by project attachment and declared library/version/language/platform compatibility.
- Returns bounded excerpts with original source locations, version metadata, timestamps and provenance.
- Preserves reviewable engineering findings, decisions, failed approaches and handoffs.
- Provides a project-bound, read-only Serena bridge for supported code definitions and references.

```text
Approved sources -> gathering and refresh -> Grounded Docs indexes
                                             |
                                   Context Companion MCP
                                             |
                                    Your AI app or agent
                                             |
                                      Its chosen model
```

Knowledge is an accelerator. Missing indexed evidence should prompt further investigation, not prevent your agent from researching other solutions. Retrieval relevance and citations do not establish that a proposed fix works; execution still matters.

## Install on Windows

1. Download this repository with **Code > Download ZIP**, or clone it. Extract the whole folder to a permanent location such as `C:\ContextCompanion`. The compiled `dist` application is included.
2. On **Windows x64**, double-click **Install.bat**. Initial installation requires Internet access. It installs isolated Node, Grounded Docs, uv/Python/Serena and the optional local embedding runtime, then runs live installation checks.
3. When the dashboard opens, choose **Add project**, enter an existing project folder, and select whether to connect Codex and index eligible project files.
4. Add a small set of relevant sources under **Knowledge sources**, then confirm indexing and inspect a real passage in **Search & evidence**.
5. For Codex, open that same project folder and review/trust its managed configuration and hooks. Start a fresh chat after integration changes.

On later runs, use **Start.bat**. Keep the controller running for scheduled refreshes; it is not installed as a Windows startup service.

No mandatory Docker, WSL, GPU, cloud database or paid embedding service is required. Your AI app/account is separate. Optional public Git source ingestion requires Git for Windows in PATH.

See the [installation and troubleshooting guide](docs/INSTALLATION.md) for browser support, keyword-only mode, data location and recovery.

## Use it day to day

1. Attach documentation for the versions you actually use. Supply compatibility metadata for API references.
2. Set a refresh interval, for example 24 hours for a website or 1 hour for frequently edited local docs. Zero means manual refresh.
3. Ask your AI app a concrete question with the library, version, API/error and platform where relevant.
4. Inspect supporting excerpts and citations. If automatic delivery misses, ask the agent to call `context_search` explicitly.
5. Record validated discoveries and failed attempts so the next session can retrieve them.

Example prompt:

> Use context_search for this library version and error. Show the original supporting excerpt and citation before proposing a change. If evidence is missing or stale, research primary sources and explain the gap.

For local documentation changes, select the source and click **Refresh / retry**, confirm **Indexed** and a recent **Last good index**, then search for a changed passage.

Follow the [usage walkthrough](docs/USAGE.md). A manual source refresh and an explicit chat search are separate operations: searching does not by itself update a source's index.

## MCP hosts and models

The documentation server uses **local stdio MCP**, launched with `dist/cli.js mcp --home DATA_HOME --project PROJECT_ID`. Each connection remains bound to that project. The controller's internal HTTP API is not a Streamable HTTP MCP endpoint.

| Integration | Current scope |
|---|---|
| Codex | Managed MCP entries, project instructions and automatic hooks; scoped Windows proofs, with reliability limits still open |
| Other stdio MCP hosts | Existing server/interface; manual configuration and end-to-end verification required |
| LM Studio chat models / an app using Flash | Possible through a compatible MCP host; not yet verified as complete chat workflows here |
| LM Studio embedding server | Existing local embedding endpoint supported; scoped live Nomic indexing/search proof |

Embeddings support retrieval; they are separate from the chat model generating an answer. See [MCP setup](docs/MCP.md) for a configuration example and verification steps.

## Components

| Component | Responsibility |
|---|---|
| TypeScript controller and local dashboard | Projects, source permissions, jobs, refreshes, evidence, memory and recovery |
| Grounded Docs | Document conversion, structural chunking, SQLite FTS/vector storage and upstream search |
| Optional local embedding worker | Managed CPU embeddings or an existing loopback embedding endpoint |
| Serena bridge | Read-only definitions/references in supported languages, bound to one project |

This project integrates those components. It does not train chat models or guarantee that retrieved documentation resolves a runtime defect.

## Controls

| Launcher | Purpose |
|---|---|
| Install.bat | Install dependencies and verify them |
| Start.bat / Stop.bat | Open or stop the local controller |
| Diagnose.bat | Save installation/runtime diagnostics |
| Verify-Installation.bat | Exercise the installed retrieval, embedding and Serena workflow |
| Run-Tests.bat | Run the production baseline using managed Node after installing the pinned development dependencies |
| Verify-Codex.bat | Run an actual model/MCP verification with explicit model-use confirmation |
| Backup.bat / Restore-Backup.bat | Back up private application data or restore a verified snapshot |
| Uninstall.bat | Remove managed integration; review options for retaining/removing app data |

## Development

The compiled controller has no production npm dependencies. The regression suite requires the pinned development dependencies, including TypeScript for an independent parser test adapter. Install them before running `npm test` or `Run-Tests.bat`. With a compatible Node installation (the Windows installer pins Node 24.21.0):

```powershell
npm ci --ignore-scripts
npm run build
npm test
```

`npm test` selects the production baseline. `npm run test:research` selects the preserved research checks; `npm run test:diagnostic` selects both. The [verification report](docs/TEST_RESULTS.md) distinguishes the published snapshot, later local candidate, GitHub CI and live Windows checks. Controlled tests do not substitute for live upstream, native Windows or AI-host verification. Keep `dist` synchronized with `src`.

The source includes synthetic fixtures and the specifically licensed upstream documentation snapshots required by the tests. Private local investigation artifacts and original failure receipts are excluded from this publication and retained in the development workspace. The [status page](docs/PUBLIC_STATUS.md) summarizes those limits without publishing user data.

## Privacy, dependencies and license

Application data defaults to `%LOCALAPPDATA%\ContextCompanion`, outside the source folder. It contains private indexes, tokens, memories, logs, backups, downloaded runtimes and model caches. **Do not commit or upload that directory.** Local embeddings/storage do not prevent an AI host from sending retrieved excerpts to its configured provider.

Source approval and credential detection are bounded safeguards, not a complete security sandbox. Read [security and privacy](docs/SECURITY.md), [dependency details](docs/DEPENDENCIES.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Original Context Companion code is [MIT licensed](LICENSE). Independently licensed dependencies and upstream documentation retain their own licenses.
