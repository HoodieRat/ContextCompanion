# Tests and acceptance results

## Documentation repair checkpoint — 2026-10-13

The current working code builds and passes **189/189 baseline** and **227/227 diagnostic** checks, with zero failures, skips or cancellations. Two new regression files add six checks; original tests, assertions and sealed evidence remain intact. The publication copy independently passes build, baseline and diagnostic suites; the documented native Windows batch launcher passes **189/189**. Application/test parity covers **480 files**, and all **342** previously published protected test/evidence/vendor files remain byte-identical. The local preservation seal covers **9,214** original files.

The unchanged twelve-case daily-documentation protocol now passes **12/12 in a known-regression replay**, including the three previously failing cases. The original fresh **9/12 FAIL** receipt remains unchanged. This replay is not a new holdout or full release acceptance.

The repairs prioritize applicable guides for factual application questions, remove a lifecycle-question preamble only from Grounded ranking, and require one affirmative passage to support bounded causative or conditional actor operations. Explicit source choices, library/version compatibility, authorization, packet limits and Grounded conversion/storage ownership remain authoritative. These are bounded lexical checks; synonyms and unseen question forms remain limitations.

Fresh installed-runtime first/repeated turns pass **15/15** for the final lifecycle candidate, with zero model tools and matched input, retrieval and delivered-context hashes. A separate guide-operation runtime run also passes **15/15**. Actual delivery in a reused human GUI chat is verified: the formatted composer prompt's trimmed hash, session and turn match Windows/controller receipts, and the supplied developer-context bytes match the hook's completed packet hash. Its cited answer uses zero model tools. That GUI turn ran the guide/support candidate immediately before the final lifecycle-ranking change; the final candidate has the separate runtime check above. Earlier missing receipts in the original chat remain preserved, and this does not certify every GUI session.

The first broader diagnostic candidate failed an existing API-support assertion; the corrected candidate retains that assertion and passes. A subsequent known replay scored **11/12** before the separately developed lifecycle normalization; that failure is also retained. An independent keyword-indexed lifecycle corpus still scores **2/3**, with an unsupported encryption question returning related evidence both before and after this repair. This unresolved abstention case and the other release gates keep **full release acceptance FAIL**. The two existing approved normal-project sources were refreshed successfully; 61 memories retain their bodies, approval statuses and revisions. A direct unsigned PowerShell launch was refused by the host policy; the existing documented batch entry point passed without changing system policy. Raw private receipts, chat transcripts, host configuration and local evaluation inputs are excluded from publication.

Updated 2026-10-13. **Full release acceptance remains FAIL.** Passing controller tests and finite live checks establish their stated scope, not general retrieval quality or reliable delivery for every host session.

## Earlier source publication (PR #2)

The public application source, compiled output, UI, tests/fixtures, vendor files, package metadata, pins and notices matched the then-working project across **478 files**, allowing line-ending normalization. The newer repairs are included in this source update.

| Executed check | Current result | Scope |
|---|---|---|
| Pinned development dependency install and TypeScript build in the publication copy | **PASS** | Exact lockfile, synchronized compiled output |
| Publication-copy production baseline | **183/183 PASS** | Zero failures/skips/cancellations |
| Publication-copy full diagnostic suite | **221/221 PASS** | All 183 baseline and 38 preserved research checks; zero failures/skips/cancellations |
| Native Windows baseline launcher with managed Node | **183/183 PASS** | Actual PowerShell launcher, pinned parser-test dependency installed |
| Native launcher without the parser-test dependency | **Expected refusal verified** | Exit 1 and explicit prerequisite message; no tests falsely reported as executed |
| Original published test/fixture/evidence/vendor preservation | **336 files unchanged** | Existing Grounded query tests gain an additive regression; no old assertion or holdout rewritten |
| Fresh staged-application live Grounded workflow | **14/14 PASS** | Installed parser/index/search, directly driven hook routing/negative control, freshness/failure preservation, restart and real controller timer |

Both GitHub workflows install the exact development dependencies before tests. TypeScript is used only by an independent regression-test parser adapter; production corroboration uses Grounded's installed parser. The compiled controller still has no production npm dependencies. See [test suites](TEST_SUITES.md).

The 14-check live retry uses an isolated data home, keyword indexing and an aged due timestamp. The actual minute-timer refresh/search observation takes 81.9 seconds. Production settings and clocks are unchanged. Direct service-hook calls do not establish automatic GUI/model delivery. The first harness mistakenly left one of two source files in its empty-folder check; that failure is retained, and the fresh retry removes both files without weakening assertions or changing production code. Grounded's converter also emitted a partial TypeScript parser warning; original logs remain available locally. Finite checks do not certify complete conversion of arbitrary code.

## Earlier published code and local development checkpoint

| Snapshot | Executed checks | Qualification |
|---|---|---|
| Earlier public GitHub code, `a646fa6` | Production baseline **151/151 PASS**, rerun for the documentation-only PR #1; zero failures/skips/cancellations | Historical source/test snapshot, now superseded by the current source publication. |
| Then-local development candidate | `npm run build` PASS and production baseline **183/183 PASS**, rerun for PR #1; zero failures/skips/cancellations | PR #1 did not ship these source repairs; the current source publication includes them. |
| Published GitHub controller workflow | Windows and Linux jobs PASS on `a646fa6` | [Existing successful run](https://github.com/HoodieRat/ContextCompanion/actions/runs/38372928513); not a run of this later local candidate. |
| Manual GitHub native Windows workflow | Corrected workflow registered; live installation gate not dispatched after correction | [Original definition failure](https://github.com/HoodieRat/ContextCompanion/actions/runs/38372634846) remains visible. No fresh-run success is claimed. |

No full diagnostic rerun was performed for PR #1. The current source publication now has a **221/221** diagnostic run; earlier full-suite results retain their original dates and source snapshots.

## Earlier local live checks

These checks used actual installed Windows components. They are earlier receipts reviewed for publication, separate from the fresh 14-check staged-application run above.

| Check | Result | Limit |
|---|---|---|
| Configured Windows hook command | **9/9 PASS** | Direct command invocation; does not prove GUI dispatch. |
| Fresh/repeated automatic installed-runtime session | **15/15 PASS** | Zero model tools and correlated input/retrieval/delivered-context hashes; one finite session. |
| Separate fresh session using GUI runtime flags | **9/9 PASS** | One turn; not the reused human GUI session. |
| Grounded freshness, failed-refresh preservation, restart and actual controller timer | **10/10 PASS** | Isolated project, aged due timestamp, unchanged production clock/settings; timer observation about 78 seconds including indexing/search. |
| Newly sealed daily-documentation evaluation | **9/12 FAIL** | 7/8 supported cases, 2/4 strict abstentions; citation-path harness retry and warmed caches disclosed. |
| Four reused-GUI user turns | **UNVERIFIED delivery** | Answers are correct and cited, but fresh dispatch/retrieval receipts are absent. |

The published implementation now distinguishes guide questions from project-code questions, corroborates supported TS/JS member quotations against approved snapshots, keeps compact accepted-memory previews in bounded startup packets, and avoids a recognized response-only suffix displacing relevant setup instructions. Those changes retain existing source permissions, version filters, support guards and deadlines.

The historical 9/12 evaluation left one supported passage missing from its first five excerpts and two strict no-results assertions failing. One failed negative case returns an explicit denial of the requested behavior; a strict abstention failure does not itself establish fabricated support. All 76 returned citations match current original-file hashes and packet limits pass. The original harness failure and all earlier first-use failures remain preserved. That documentation-only checkpoint made no production changes; the later repair method and known-replay scope are recorded above.

## Reproduce the available checks

```powershell
npm ci --ignore-scripts
npm run build
npm test
```

`npm test` runs the explicitly selected production baseline. `npm run test:research` runs preserved research checks; `npm run test:diagnostic` selects both. An unexecuted suite, missing dependency, zero tests or skipped checks is not a pass.

For installed Windows workflows, use `Verify-Installation.bat` and inspect its saved report. `Verify-Codex.bat` requires actual model/MCP use and explicit model-use confirmation; its explicit retrieval proof does not establish automatic hook delivery. Inspect automatic-retrieval evidence separately and match it to the actual prompt/session.

GitHub's controller workflow checks shipped JavaScript, executes the baseline and full diagnostic suites, builds from pinned development requirements and checks that `dist` remains synchronized. The manual Windows workflow exercises an isolated dependency installation; its existence is not a passing run.

## Remaining acceptance gates

Unseen retrieval quality; dependable dispatch across GUI sessions; long-term/load-dependent host delivery; historical ASCII failure attribution; broader extraction/OCR and upstream Windows compatibility; and end-to-end other MCP-host/chat-model workflows remain open. Features are frozen. See [PUBLIC_STATUS.md](PUBLIC_STATUS.md) for progress, evidence limits and publication scope.

Original failures, local detailed reports and frozen holdout inputs remain in the private development workspace. Public summaries do not erase them or publish private data.
