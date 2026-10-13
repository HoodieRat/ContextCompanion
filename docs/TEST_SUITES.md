# Test suites

Current keyword repair: build PASS, baseline **195/195**, diagnostic **233/233**, zero failures/skips/cancellations. The six new checks are in [keyword-support.test.mjs](../tests/keyword-support.test.mjs); all original tests and suite memberships are retained. Native and CI results below belong to the previous checkpoint until new executions complete.

Previous source publication, 2026-10-13: build PASS, production baseline **189/189 PASS**, full diagnostic **227/227 PASS** and native Windows baseline **189/189 PASS**, with zero failures/skips/cancellations. These counts describe the source/test snapshot included in this publication.

| Command | Selection |
|---|---|
| `npm test` / `Run-Tests.bat` | 189 production baseline checks |
| `npm run test:research` / `Run-Tests.bat -Suite research` | 38 preserved research checks |
| `npm run test:diagnostic` / `Run-Tests.bat -Suite diagnostic` | Both selections, 227 checks |

Install the exact development dependencies with `npm ci --ignore-scripts` before running the baseline or diagnostic suite. The code-context regression adapter uses pinned TypeScript; the application uses Grounded's installed parser. Missing dependencies or zero executed tests are not success. The Windows launcher reports the missing prerequisite explicitly.

[tests/suites.json](../tests/suites.json) lists every top-level test file exactly once. The shared runner rejects duplicates, unassigned files and empty selections, preserves child exit status and retains its existing test and suite deadlines.

The latest repair adds factual-query and guide-operation regression files (six checks). The earlier publication adds code-context, source-intent, hook-prompt, compact-handoff and instruction-directive regression files and an additive Grounded query case. Existing fixture/holdout inputs and assertions are preserved. Controlled adapters verify controller behavior; they do not replace actual Grounded, Windows or AI-host verification.

See [TEST_RESULTS.md](TEST_RESULTS.md) and [PUBLIC_STATUS.md](PUBLIC_STATUS.md) for live execution scopes and remaining acceptance failures. The unchanged daily-documentation protocol passes 12/12 as a known replay, with its original 9/12 failure preserved. One actual reused-GUI turn has matched packet receipts; broader reliability and release acceptance remain open.
