# Tests and acceptance results

## Current verified repairs — 2026-10-13

Build PASS; **203/203 baseline** and **241/241 diagnostic**, zero failures/skips/cancellations. All original tests/assertions and failure evidence remain intact. The keyword-only bypass is repaired using bounded literal support: lifecycle requests require their object and condition in one passage, and separately proved API identifiers retain declaration proof. Default bare-topic navigation remains available; explicit lexical mode remains strict. Lifecycle expiration events no longer become duration-field requests. These rules do not establish general entailment or synonym coverage. [Retrieval](../src/retrieval.ts), [support](../src/evidence-support.ts), [request parsing](../src/support.ts).

Two additional live failures were repaired. Serena now supplies the managed uv directory to its child-process PATH instead of relying on a workstation installation. The existing single CPU embedding worker warms during Grounded startup and prioritizes interactive requests ahead of waiting indexing batches; inference remains serial, admission stays bounded, and four query batches yield to indexing. Disconnected queued requests are skipped. External provider URLs, model identity, vector storage and hook deadlines remain unchanged. [Serena environment](../src/serena.ts), [queue](../src/embedding-queue.ts), [worker](../src/embedding-worker.ts), [connections](../src/embeddings.ts), [Grounded routing](../src/grounded.ts).

| Executed check | Result and scope |
| --- | --- |
| Original daily documentation protocol | **12/12 PASS** after current-code/source refresh, with original prompts, citation/hash/budget criteria and original **9/12 FAIL** preserved. Known replay, separate from the frozen holdout. |
| Original keyword lifecycle failure | **3/3 PASS**, unchanged known replay; original **2/3 FAIL** and rejected candidates preserved. Independent real Grounded keyword development **10/10**. |
| Frozen previously unexecuted retrieval holdout | **16/16 grouped + 16/16 per-file**: eight supported/eight abstention cases per layout, zero forbidden hits. Implementation and inputs frozen before execution; no outcome-driven tuning. p95 approximately 3.92/5.09 seconds. This finite corpus does not certify unseen questions universally. |
| Current reused GUI composer | **PASS**: fresh local-folder refresh prompt in Compare project coding assistants; exact session/turn, controller audit with eight hits, and developer-packet bytes matching the Windows hook context hash; zero model tools. Earlier timeout/no-packet receipt is preserved. |
| Installed automatic Codex runtime | **39/39 PASS** across six actual first/repeated turns with matched packet/trust/correlation checks and zero model tools. Separate from the human composer proof. |
| Real CPU queue contention | **10/10 PASS**: three cycles with six heavy indexing batches, query overtaking queued indexing, unchanged vectors, query latency approximately 1.09–1.24 seconds under the unchanged 11-second CLI budget. Finite stress check, not continuous reliability certification. |
| Fresh native Windows install and removal | [Run 38475106206](https://github.com/HoodieRat/ContextCompanion/actions/runs/38475106206) **PASS** on repaired source commit 1f1a422: actual pinned dependencies, CPU model, Grounded ingestion/exact-version/semantic search, Serena definition/references, baseline suite, runtime removal, five retained-data sentinels and registry preservation. Original failed install [38468172379](https://github.com/HoodieRat/ContextCompanion/actions/runs/38468172379) remains preserved. |
| Existing external embeddings and local chat | **9/9 PASS** using the already installed Nomic 768-dimensional endpoint and already downloaded Qwen3.5-9B chat model. Actual Grounded vector retrieval, labelled unavailable-endpoint keyword fallback, model-generated MCP tool call and cited response. Finite API/official-SDK driver; native LM Studio GUI MCP registration was not exercised. Embedding and chat models are separate roles. |
| Normal project-bound official MCP SDK | **3/3 PASS**: initialization/tools, context_project and project-switch/tool-error rejection. |
| Current document extraction | **5/5 PASS** for PDF, DOCX, RTF, structured HTML and Unicode CSV, preserving tested values/negation and original file hashes. Finite fixtures; visual layout, scanned OCR and arbitrary-document fidelity remain uncertified. |
| Actual JavaScript rendering | **PASS** on the same public page: fetch control succeeds without browser-only text; installed Playwright succeeds with that text. Original failed approaches remain preserved. Finite page comparison. |
| Installed UNKNOWN license provenance | Primary installed license files found and hashed for all eight entries: four MIT, three BSD-3-Clause and pathspec MPL-2.0. Original UNKNOWN metadata inventory unchanged. This supplementary provenance is not complete distribution/weight redistribution clearance. |

**Full release acceptance remains FAIL.** Remaining limits are scanned OCR and arbitrary/representative-document fidelity beyond these fixtures, native third-party GUI registration, broader/long-running delivery reliability and full installed-distribution/model license clearance. Historical ASCII missing-dispatch cause attribution is unresolved; successful new receipts do not reconstruct old missing events. No new ingestion engine, chat application, OCR engine or unapproved model download was introduced. Earlier checkpoints below are historical, including their original failures. Private raw transcripts, receipts, application data, indexed user documents, model caches and installed runtimes are excluded from GitHub; the public payload and manifest are reviewed separately.

## Historical: Runtime and model checks — 2026-10-13

The keyword repair is accompanied by two existing-workflow repairs. Serena child processes now locate the managed uv executable without depending on the workstation PATH. The single local embedding worker prioritizes interactive queries ahead of waiting indexing batches, bounds admission atomically, skips disconnected queued work, and warms the same pinned CPU model during Grounded startup. Four query batches yield to indexing to avoid starvation; inference remains serial. External embedding URLs are unchanged.

Current local build PASS, **203/203 baseline** and **241/241 diagnostic**, zero failures/skips/cancellations. The real installed Serena definition/reference check passes **5/5**. An existing Nomic endpoint and already-downloaded Qwen3.5-9B chat model pass **9/9** finite API/MCP checks, including model-generated retrieval, citation, and labelled unavailable-endpoint fallback. Six automatic installed Codex runtime turns pass **39/39** packet/trust/correlation checks without model tools; this does not certify the human composer GUI. A later real GUI prompt received a timeout warning during source indexing; that failure is preserved and current GUI re-verification remains open. The first fresh Windows install failed on the managed uv PATH; its receipt remains preserved while the repaired candidate is rechecked. Frozen holdout, fresh Windows install/uninstall and remaining release gates are pending. **Full release acceptance remains FAIL.**

## Historical: Keyword abstention repair — 2026-10-13

Keyword-only natural-language requests now pass literal support checks instead of treating every upstream candidate as supported. Lifecycle questions bind the requested object and condition in one passage. Default bare-topic navigation retains its existing candidate contract; explicit lexical mode stays strict. Independently corroborated API identities retain their declaration proof. A lifecycle expiration condition no longer becomes a duration-field request; explicit object fields remain bound. This is bounded lexical corroboration, not general entailment or synonym matching. Implementation: [retrieval.ts](../src/retrieval.ts), [evidence-support.ts](../src/evidence-support.ts), [support.ts](../src/support.ts).

Local build, **195/195 baseline** and **233/233 diagnostic** checks pass, with zero failures/skips/cancellations. Six added keyword checks preserve every original test and assertion. Independent actual Grounded keyword development passes **10/10**. The unchanged original lifecycle protocol now passes **3/3 as a known replay**, including strict zero-hit abstention; its original **2/3 FAIL** receipts remain intact. Intermediate candidates rejected by original generation-navigation, explicit-lexical and API-identity checks are preserved.

The remaining release gates are being checked separately: an unexecuted frozen retrieval holdout, repeated/concurrent runtime delivery, current-code GUI receipts, broader format/conversion controls, existing external embeddings/chat availability, installed license provenance and an isolated native Windows dependency-install workflow. No unexecuted gate is marked passed. Historical ASCII cause attribution and universal/long-term fidelity are not established by these finite checks. **Full release acceptance remains FAIL.**

## Historical: Documentation repair checkpoint — 2026-10-13

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
