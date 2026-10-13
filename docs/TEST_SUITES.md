# Test suites

Current source publication, 2026-10-13: build PASS, production baseline **183/183 PASS**, full diagnostic **221/221 PASS** and native Windows baseline **183/183 PASS**, with zero failures/skips/cancellations. These counts describe the source/test snapshot included in this publication.

| Command | Selection |
|---|---|
| `npm test` / `Run-Tests.bat` | 183 production baseline checks |
| `npm run test:research` / `Run-Tests.bat -Suite research` | 38 preserved research checks |
| `npm run test:diagnostic` / `Run-Tests.bat -Suite diagnostic` | Both selections, 221 checks |

Install the exact development dependencies with `npm ci --ignore-scripts` before running the baseline or diagnostic suite. The code-context regression adapter uses pinned TypeScript; the application uses Grounded's installed parser. Missing dependencies or zero executed tests are not success. The Windows launcher reports the missing prerequisite explicitly.

[tests/suites.json](../tests/suites.json) lists every top-level test file exactly once. The shared runner rejects duplicates, unassigned files and empty selections, preserves child exit status and retains its existing test and suite deadlines.

The publication adds code-context, source-intent, hook-prompt, compact-handoff and instruction-directive regression files and an additive Grounded query case. Existing fixture/holdout inputs and assertions are preserved. Controlled adapters verify controller behavior; they do not replace actual Grounded, Windows or AI-host verification.

See [TEST_RESULTS.md](TEST_RESULTS.md) and [PUBLIC_STATUS.md](PUBLIC_STATUS.md) for live execution scopes and remaining acceptance failures. The broader daily-documentation evaluation remains 9/12 and reused-GUI automatic delivery remains unverified.
