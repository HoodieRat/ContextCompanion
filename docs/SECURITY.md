# Security and privacy boundaries

Context Companion is a single-user, local-first application. It is not an OS sandbox, confidential computing system, public server or complete prompt-injection prevention system.

The controller binds to 127.0.0.1, checks Host and Origin, and authenticates API calls with a random local bearer token. The dashboard receives that token in a local URL fragment and removes the fragment immediately. Static UI files have a restrictive Content Security Policy; dynamic source text is assigned with textContent instead of interpreted HTML. Do not expose the port through a tunnel or publish daemon.json.

Each agent connection is bound to one project. Sources must be explicitly attached; private sources cannot be attached to another project. Source permission/policy is checked before dispatch, after asynchronous retrieval and on cached continuation reads. Dashboard project selection does not retarget an existing MCP session. The user's authenticated dashboard can manage all their projects; this is not a multi-user authorization model.

Local indexing uses explicit source paths, excludes sensitive names/generated directories, refuses links and traversal, scans eligible text for common credential signatures and stages an immutable approved snapshot. Unknown UTF-8 text can be staged with an explicit .txt representation; original paths are preserved. Credentials inside unusual encodings, binaries, PDFs or arbitrary formats may evade heuristics. Never deliberately index secrets. Converted results are checked again before model delivery, but this does not guarantee complete redaction from every intermediate index.

Public website URLs must be HTTP(S), cannot contain embedded credentials or credential/signed query parameters, and must resolve to public addresses. Grounded's network security remains enabled for subsequent requests and redirects. Git ingestion is HTTPS-only, disables redirects and inherited hooks/filters/config, pins resolved addresses for its request and records an immutable fetched commit. Repositories are not automatically built or installed. These controls do not replace a live upstream security review, nor do they support authenticated/private repository imports. Use a reviewed local checkout for those sources.

Retrieved documents and memories are untrusted evidence. Suspicious instruction patterns are flagged, and the bridges do not turn document text into shell commands, approvals or automatic package installations. The read-only Serena proxy withholds project activation, shell and editing capabilities; Codex performs edits natively. No detector can guarantee that a model will ignore every hostile document. Native Codex tools and other processes running as the same user retain their own access and approval boundaries.

Check commands require explicit review/approval. Stored successful test evidence refers to executed commands and captured file/log hashes. Proposed findings and unexecuted tests cannot silently become verified project facts. A passed command is not proof of global software correctness.

Runtime downloads are isolated and pinned as documented; executable archives are checksum-checked. Installed dependency scripts may execute during installation, and native dependencies retain their upstream security risks. Lock and license inventories are records, not audits. Default telemetry is disabled for managed Grounded processes. Do not attach provider credentials to indexing commands.

Backups contain private sources and evidence. Keep the data home private; it is outside the release/source repository by default. The publisher copies only files named in the checksum-verified release manifest into a new clean staging directory. It defaults to a private repository and refuses to overwrite an existing repository. Do not add your data home or model cache to that manifest.

Cloud Codex can receive the excerpts that the local tools return. Local storage and local embeddings do not make a cloud coding session offline. The user remains responsible for what data is supplied to the configured model provider.
