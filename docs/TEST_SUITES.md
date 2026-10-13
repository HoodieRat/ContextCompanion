# Test suites

Current Phase 1 candidate: build PASS, baseline **211/211**, diagnostic **249/249**, zero skipped/cancelled/failed. Eight new checks extend original suite membership/assertions. Professional acceptance remains FAIL; see [phase plan](RELEASE_COMPLETION_PLAN.md).

Current executed candidate: build PASS, baseline **203/203**, diagnostic **241/241**, zero failures/skips/cancellations. New keyword, managed Serena-runtime and embedding-priority checks extend the original suite membership and assertions. Windows/Linux CI passes; fresh real Windows installation and runtime-removal retention pass [38475106206](https://github.com/HoodieRat/ContextCompanion/actions/runs/38475106206). Controlled adapters remain separate from live upstream verification. See [TEST_RESULTS](TEST_RESULTS.md) for executed scopes and unresolved gates.

## Historical checkpoints

Current runtime repair: build PASS; baseline **203/203**, diagnostics **241/241**, zero skipped/cancelled. New managed-runtime and queue checks extend the original suite. Fresh upstream Windows installation and current GUI acceptance are still being verified. Earlier counts below are historical.

Current keyword repair: build PASS, baseline **195/195**, diagnostic **233/233**, zero failures/skips/cancellations. The six new checks are in [keyword-support.test.mjs](../tests/keyword-support.test.mjs); all original tests and suite memberships are retained. Native and CI results below belong to the previous checkpoint until new executions complete.

Previous source publication, 2026-10-13: build PASS, production baseline **189/189 PASS**, full diagnostic **227/227 PASS** and native Windows baseline **189/189 PASS**, with zero failures/skips/cancellations. These counts describe the source/test snapshot included in this publication.

| Command | Selection |
|---|---|
| `npm test` / `Run-Tests.bat` | 203 production baseline checks |
| `npm run test:research` / `Run-Tests.bat -Suite research` | 38 preserved research checks |
| `npm run test:diagnostic` / `Run-Tests.bat -Suite diagnostic` | Both selections, 241 checks |

Install the exact development dependencies with `npm ci --ignore-scripts` before running the baseline or diagnostic suite. The code-context regression adapter uses pinned TypeScript; the application uses Grounded's installed parser. Missing dependencies or zero executed tests are not success. The Windows launcher reports the missing prerequisite explicitly.

[tests/suites.json](../tests/suites.json) lists every top-level test file exactly once. The shared runner rejects duplicates, unassigned files and empty selections, preserves child exit status and retains its existing test and suite deadlines.

The latest repair adds factual-query and guide-operation regression files (six checks). The earlier publication adds code-context, source-intent, hook-prompt, compact-handoff and instruction-directive regression files and an additive Grounded query case. Existing fixture/holdout inputs and assertions are preserved. Controlled adapters verify controller behavior; they do not replace actual Grounded, Windows or AI-host verification.

See [TEST_RESULTS.md](TEST_RESULTS.md) and [PUBLIC_STATUS.md](PUBLIC_STATUS.md) for live execution scopes and remaining acceptance failures. The unchanged daily-documentation protocol passes 12/12 as a known replay, with its original 9/12 failure preserved. One actual reused-GUI turn has matched packet receipts; broader reliability and release acceptance remain open.
