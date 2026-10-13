# Original test fixture corpus
All library names, APIs and project facts in this directory are **fictional test data**. They are not documentation for real packages and must never become hard-coded production behavior. The content is provided under `PACKAGE_LICENSE.md`.

There are three unrelated project groups. The corpus includes compatible and incompatible versions/platforms, context state, duplicated content, malicious instructions and private canaries. `retrieval_cases.jsonl` provides expected source files, filters and holdout labels. It is a specification of expected retrieval, not measured application results.

Create additional audited binary PDF/Office/OCR fixtures during application implementation. The included `unsupported.bin` only tests rejection of unknown binary data. Local fixture web/Git servers are test-only and use injected transport policy rather than allowing private IPs in production.
