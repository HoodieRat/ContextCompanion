# Installation and troubleshooting

## Requirements

- Windows x64 with Windows PowerShell and Internet access for initial downloads.
- A permanent installation folder containing the complete repository, including `dist`, `scripts`, `public`, `vendor` and `dependency-pins.json`.
- An existing AI app/account for the agent workflow. A separate chat model is not needed for indexing.
- Git for Windows in PATH if you use public Git repository sources. GitHub CLI is needed only for the optional publisher.

The Windows installer downloads isolated dependencies into the private data home. You do not need to install system-wide Node or Python first. Windows ARM64 is not supported by this package; cross-platform controller tests do not establish Linux/macOS installer support.

## First installation

1. Download **Code > Download ZIP** from the repository, or clone it.
2. Extract the whole folder to a permanent path, such as `C:\ContextCompanion`. Do not run inside the ZIP.
3. Double-click `Install.bat`. A failed download or live verification is reported as a failure; check the displayed log path.
4. When the dashboard opens, register your existing project. Choose whether to connect Codex and index eligible project files.
5. Add approved sources and verify a passage through Search & evidence. Follow [USAGE.md](USAGE.md).

Avoid moving the app after connecting projects: MCP commands contain its installation path. Reconnect projects if you intentionally move it.

## Optional installation modes

Run these from the installation folder in PowerShell:

```powershell
# Add Chromium for documentation whose visible text requires JavaScript.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1 -WithBrowser

# Install without the managed local embedding package; use keyword retrieval.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1 -KeywordOnly

# Repair/re-run dependency installation and verification.
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install.ps1 -Repair
```

Browser support does not enable OCR. Use the Playwright source renderer only when necessary. `-SkipVerification` explicitly skips checks and does not establish a verified installation.

## Data home and normal operation

By default, data stays in `%LOCALAPPDATA%\ContextCompanion`. To choose another permanent location, set `CONTEXT_COMPANION_HOME` before installation and use that same value on subsequent launches. The home contains installation identity, approved snapshots/indexes, private tokens, memory, logs, backups and model caches.

Use `Start.bat` to open the dashboard and `Stop.bat` to stop managed processes. Scheduled refresh runs only while the controller runs. Run `Diagnose.bat` for a saved diagnostic report or `Verify-Installation.bat` for actual installed-tool checks.

## Embeddings

Managed CPU embeddings are the default when installed. For an existing local embedding service, open **Local services > Configure embeddings** and enter the real model identifier, dimensions, loopback base URL and revision label. Run the real probe, then refresh sources to publish vectors for the selected identity. Changing a model does not convert existing generations automatically.

Existing LM Studio Nomic has scoped live indexing/search evidence. That is an embedding connection, separate from using an LM Studio chat model through MCP. External embedding identities do not inherit the calibrated managed CPU support cutoff. An unavailable semantic service can fall back to keyword search with a warning.

## Troubleshooting

| Symptom | First check |
|---|---|
| Installation/verification failed | Read the displayed private install log; run Diagnose.bat and check the failed dependency |
| JavaScript-only page lacks useful text | Install Chromium with `-WithBrowser`, choose Playwright, and refresh |
| Source is Indexed but a fact is absent | Inspect Import report and Search & evidence; the required page may not have been collected |
| Source excluded for compatibility | Check the actual library version and source/project metadata; unknown API compatibility is excluded by default |
| New local passage is missing | Click Refresh / retry, inspect Last good index, and search the passage again |
| Codex has no evidence | Reconnect the matching project, start a fresh chat, review hooks, and use explicit context_search |
| Other MCP host cannot connect | Follow [MCP.md](MCP.md); check command paths, project ID, transport and tool-call timeout |

## Backup and removal

`Backup.bat` creates a private application-data snapshot. Treat it as sensitive. Restore through `Restore-Backup.bat` while the controller is stopped. `Uninstall.bat` removes managed integration; review its options before removing app-owned runtime/data. Your source project is not the private application home.
