# Daily use

## Check the evidence for the requested behavior

Application usage and factual questions prefer applicable guide sources. Explicit source selection and named library references retain precedence. Bounded instructions that make an actor perform an operation, and actor questions with an explicit condition, require support in one affirmative passage; incidental words or a documented denial cannot establish that operation. Polar and explanatory questions can legitimately retrieve restrictions or denials. This guard is a spelling-based check, not general entailment. If evidence is withheld or unrelated, inspect the original source and research the gap.

## Register a project

Run `Start.bat` and choose **Add project**. Enter the existing repository/folder that the AI app will work on. **Connect Codex and add project instructions** enables the managed Codex integration; **Index eligible project files** is optional. You can also attach selected reference folders instead of indexing an entire repository.

For Codex, check **Overview > Edit project > Automatic context hooks**, then connect/reconnect. Open that same folder in Codex, review/trust its configuration and hook definitions, and start a fresh chat. Other MCP hosts use [MCP.md](MCP.md).

## Gather useful documentation

Open **Knowledge sources > Add knowledge**:

| Source | Supply |
|---|---|
| Documentation website | A reviewed public HTTP(S) documentation URL |
| Public Git repository | A public HTTPS repository and branch/tag/commit |
| Local folder or file | An explicitly approved absolute path |
| Upload a document | A reference file up to 10 MiB |
| Paste knowledge | A short reference or validated engineering note |

Use names such as `LibraryName 3.2 Windows API`. Under **Compatibility & reliability**, identify the library/package, ecosystem, language, platform and known version range. Supply the actual documentation version and inspect **Overview > Stack & compatibility**. A version label alone does not prove compatibility.

Keep page/file limits and crawl depth manageable. Fetch works for ordinary pages; Playwright needs installed Chromium and is for JavaScript-rendered content. A pinned Git commit stays pinned when refreshed. Authenticated/private Git imports are not supported; use an approved local checkout.

Click **Add & index**, inspect **Activity & tests**, and check **Indexed**, **Last good index** and **Import report**. Search for a fact you can verify in the original source. An indexed status alone does not establish complete source coverage or correct extraction.

## Refresh

For automatic Codex context, ordinary usage questions favor sources marked **guide**; implementation and named code-symbol questions favor **project context**. Explicit source selection still takes precedence. Named external library references retain their metadata preference and all compatibility checks. Automatic hooks search one source within their deadline; explicit MCP search can use the broader attached source set.

Project code-symbol lookups use keyword candidates first. For supported TypeScript/JavaScript class methods, the controller may corroborate a returned quotation with Grounded's installed parser and quote that exact member from the approved snapshot. Missing, ambiguous, malformed or unsupported declarations remain unproved. This does not make code retrieval exhaustive or certify that an implementation behaves correctly.

Accepted project decisions are supplied at session start. Oversized startup/handoff snapshots retain compact memory previews, stale flags and record IDs; use `context_memories` and `context_memory_read` for the complete records. Proposals retain their existing approval status. A changed reference marks a memory stale; it does not rewrite or erase the accepted decision. Important new findings should be saved with sources, validation and limitations; chat history is not automatically archived as memory.

In a source's **Edit settings**, enable retrieval and scheduled refresh. A starting interval could be 24 hours for public documentation and 1 hour for frequently edited local docs. Zero means manual refresh; the add-source form initially shows 24 hours. Keep the controller running.

After an important edit, click **Refresh / retry**, confirm a recent **Last good index**, then search for a changed passage. Upload a new snapshot for a changed uploaded document.

## Use the context

Include the library, actual version, relevant API/error and platform in your task. For example:

> Investigate this timeout using the attached LibraryName 3.2 Windows reference. Cite the documented behavior and distinguish it from what our logs prove before changing code.

When supported hooks are invoked and delivered, Codex receives project context at session start and a bounded retrieval packet for substantive prompts. The automatic prompt path searches one selected source within its deadline; explicit `context_search` can inspect more sources. Short acknowledgements need not trigger retrieval.

Use ordinary task messages; no special context-fetching question is required. Before automatic retrieval, the controller removes a recognized leading desktop browser-context block and reads question/answer values from a recognized form-reply envelope. Browser URLs and form transport IDs do not become required code identifiers. Actual task text, versions, identifiers and qualifiers remain intact; quoted examples and malformed or unknown envelopes remain literal text. This does not guarantee that a relevant passage will be found or delivered.

Inspect **Search & evidence > Inspect last automatic retrieval** immediately after a documentation-specific prompt. Match its query/time: another explicit search or chat can overwrite that project-wide view. A plausible answer does not establish successful delivery.

When evidence is missing:

> Use context_search for [library/version/API or error]. Show the supporting excerpt and citation. If stored evidence is missing or stale, research primary documentation and explain the gap.

`context_read` can continue a bounded result. Use the optional `context_code` tools for supported definitions/references; your agent retains its normal editing tools.

## Keep useful engineering memory

Use **Development memory** to save findings, decisions, failed attempts and handoffs. Agent submissions are reviewable proposals. Record source links, limitations and actual executed checks; an unexecuted test is not a pass. Accepted decisions and evidence can become stale as code changes.

For a retrieval miss, preserve the natural task prompt, original supporting passage, source/version, returned warnings and source freshness/permission. First distinguish coverage, extraction, compatibility, routing/ranking, support filtering and hook delivery. Missing stored evidence does not prove a solution is unavailable.

## Share sources deliberately

Each MCP connection is permanently bound to its project. Dashboard selection does not retarget it. Shared sources must be explicitly attached to each project; a private source does not become global because its name matches. Use separate project IDs/configurations when moving between repositories.
