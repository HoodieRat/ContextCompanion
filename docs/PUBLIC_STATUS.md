# Status and publication scope

Updated 2026-10-13. Version 1.1.0-rc.1 is a beta/release candidate. **Full release acceptance remains FAIL.** Features are frozen; existing retrieval, ingestion, freshness, delivery and documentation repairs remain in scope.

## Verification checkpoint — 2026-10-13

The published GitHub code at `a646fa6` and the later local development candidate are different snapshots. This update changes documentation only; it does not ship the later source repairs.

| Scope | Recorded result | What it establishes |
|---|---|---|
| Published code baseline, rerun for this documentation update | **151/151 PASS**, zero failures/skips/cancellations | Shipped controller regressions; not live dependency or AI-host acceptance |
| Later local candidate | Build PASS; **183/183 baseline PASS**, rerun for this update | Combined local repairs with synchronized compiled output; not the published code's test count |
| Configured Windows hook command, local candidate | **9/9 PASS** | Fresh/repeated usage and code requests, missing identifiers and secret controls; direct command execution |
| Automatic installed-runtime session, local candidate | **15/15 PASS** | Fresh and repeated turns, zero model tools, supported facts/citations and correlated delivered-context hashes |
| Separate session using GUI runtime flags | **9/9 PASS** | One fresh automatic turn with those flags; not a human composer turn in the reused GUI chat |
| Real Grounded freshness/restart/controller timer | **10/10 PASS** | Unchanged-source skip, changed-content replacement, stale memory, disabled/manual scheduling, visible failure retaining good indexes, restart and minute timer |
| Separately sealed daily-documentation evaluation | **9/12 FAIL** | 7/8 supported cases and 2/4 strict abstentions; remaining ranking/support gaps |
| Four ordinary turns in the reused GUI chat | **UNVERIFIED delivery** | Correct cited answers and zero tools, but no matching fresh Windows/controller delivery receipts |

The freshness run used an isolated project and an aged due timestamp; it did not change the production clock or settings. The real controller timer completed the refresh/search observation in about 78 seconds, including indexing. Fresh Windows command requests took about 6.5–7.5 seconds; automatic hook completion took about 10.8 seconds initially and 3.9 seconds on repeat. These finite observations do not establish sustained-load or long-term reliability.

The documentation evaluation's first harness incorrectly resolved source paths; that failure remains preserved. Its citation-path retry kept the sealed candidate and assertions and scored 9/12 with warmed caches. All 76 returned citations matched original-file hashes and all packets met their limits. One supported passage was absent from the first five excerpts. Two strict no-results assertions failed; one response contained a documented denial rather than support for the requested behavior. This is not evidence that the model fabricated that behavior.

Earlier **9/12** and **17/24** first-use failures remain unchanged. Known-regression repairs are not rescored as fresh acceptance. The reused GUI host inventory is unavailable, and prior chat context can explain its correct answers. A fresh installed-runtime pass does not resolve that running GUI dispatch gap.

Detailed local receipts remain private. The public [verification report](TEST_RESULTS.md) identifies the executed scopes and GitHub workflow status without publishing host configuration, raw chats or holdout inputs.

## Earlier recorded execution scopes

These summarize earlier local Windows evidence, not a new benchmark performed by publishing this repository:

- Approved-source gathering, indexing and citation retrieval have useful live daily-documentation examples.
- Installed Chromium passed a scoped JavaScript-rendered ingestion/search check. This does not certify arbitrary web pages, OCR or every format.
- Existing LM Studio Nomic passed a 768-dimensional probe and indexing/search check. Its semantic-support calibration remains separate from the managed CPU profile.
- Ordinary Codex delivery has scoped successful evidence, including a turn receiving a cited fact without extra tool calls. This does not establish dependable delivery for all prompts or under sustained host load.
- Three Python API identifier misses were repaired against independent official documentation tasks; separate known-regression replays passed 3/3. The original fresh 9/12 and 17/24 failure results remain preserved and have not been rescored as new passes.
- A cold-search repair disabled Node compilation caching for read-only Grounded queries. Two independent real runs passed 8/8 factual/unsupported probes, with first requests around 6.6/7.3 seconds. A normal explicit request took about 7 seconds; some uncached multi-variant requests still took about 18 seconds. This does not prove hook delivery within its deadline.
- The cold-search repair passed build and 54 focused tests. Earlier recorded test counts describe their original snapshots; they are not a claim that a new full suite ran for every small repair.

## Open gates

- Generalization to unseen documentation questions.
- Fresh delivery in the reused GUI chat, plus long-term ordinary AI-host delivery and behavior under load; fresh/repeated isolated-runtime checks above pass only in their stated scope.
- Attribution of the historical ASCII desktop delivery failure.
- Broader document/visual formats and OCR coverage.
- Preserved upstream native Windows failures and compatibility across installations.
- End-to-end LM Studio chat and other MCP-host/model workflows.
- Complete release acceptance beyond the specifically executed scopes.

Semantic similarity, metadata compatibility and green controlled tests are bounded evidence. They are not general factual entailment, proof of a working API or full upstream acceptance.

## Public repository contents

The publication includes original controller code, synchronized compiled JavaScript, dashboard assets, core installer/operation scripts, tests, synthetic fixtures, notices and user documentation. Specific public CPython/Node documentation snapshots required by tests retain their licenses and source attribution.

Private application data, installed runtimes, model weights/caches, API credentials, project-bound host configuration, indexed user documents, screenshots, delivery traces and local diagnostic artifacts are excluded. Detailed historical reports and original failure receipts are retained in the private development workspace; this public summary does not replace or erase them. It also does not expose or tune the separate local fresh holdout inputs.

The checksum release manifest describes the exact reviewed publication payload. It detects file changes; it is not a publisher signature. Never regenerate it from an unreviewed folder containing user data.

## Publication verification — 2026-10-13

The reviewed staging copy built successfully and its production baseline passed **151/151 tests**, with zero failures, skips or cancellations. The shipped CLI version/help and JavaScript syntax checks also passed. The published-code baseline was rerun for this documentation update and remains **151/151 PASS**. This does not rerun the historical research suite, an unseen retrieval holdout or a fresh-machine dependency installation. Credential and payload checks are separate from functional release acceptance. The later local candidate's **183/183** result is reported separately above.
