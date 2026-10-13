# Third-party notices

The MIT license at the repository root applies to the original Context Companion integration code, not to independently licensed dependencies or imported documents.

**Bundled code:** `vendor/semver` is npm/node-semver, under the ISC license. Its original LICENSE, package metadata and source files are retained unchanged. The synthetic ProjectContextHub fixture corpus under `tests/fixtures/plan-pack` is copied under the unrestricted permission in that folder's `LICENSE.md`; it does not contain real vendor API documentation.

**Bundled test documentation:** the specifically included public CPython 3.12.8 documentation snapshots in `evidence/windows-independent-retrieval-repair/primary` and `evidence/windows-python-identifiers-repair/primary` originate from `https://github.com/python/cpython/tree/v3.12.8/Doc/library` (asyncio-sync, hashlib, heapq, io and array). They retain the PSF license and documentation license notice in `tests/fixtures/upstream-licenses`. The Node.js 24.21.0 `path.md` test snapshot originates from `https://github.com/nodejs/node/blob/v24.21.0/doc/api/path.md`; its license and third-party notices are preserved alongside those licenses. These public test references are distinct from indexed user documents. The `evidence/windows-targeted-fixes/independent-development.json` file contains synthetic development cases, not private runtime evidence.

**Downloaded, not bundled into this release:** Grounded Docs 3.2.1 (MIT); Serena at the commit in dependency-pins.json (GPL-3.0-or-later); Transformers.js 3.7.2 (Apache-2.0); uv (MIT OR Apache-2.0); the official Node distribution and its bundled notices; Python and its bundled licenses; the embedding model and its repository/model-card license. The installer preserves their installed distributions, licenses and dependency metadata. These components communicate across process boundaries; they are not copied into this application's source or relicensed.

Upstream transitive dependencies have their own licenses. `scripts/license-inventory.mjs` records actual installed npm and Python distribution metadata. Missing/UNKNOWN entries remain visible and must be reviewed before redistributing a complete installed runtime. An inventory is not a full legal audit. Do not publish downloaded runtimes or a user knowledge database merely because this controller has an open-source license.

A rejected development experiment downloaded the pinned `Xenova/ms-marco-MiniLM-L-6-v2` ONNX conversion into the private model cache. It was removed from production retrieval and installation after failing acceptance. Its base model declares Apache-2.0; the converted repository has no license field. Preserve the archived experiment's model-card provenance and resolve conversion redistribution rights before reusing or packaging its weights. No model weights are bundled with this source release.

Primary model references: https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2 and https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2.

Primary references:
- https://github.com/npm/node-semver
- https://github.com/arabold/docs-mcp-server/tree/v3.2.1
- https://github.com/oraios/serena/tree/1de556f71569f3acfc0743e526dd60aca40a545e
- https://github.com/huggingface/transformers.js
- https://huggingface.co/Xenova/all-MiniLM-L6-v2
- https://github.com/astral-sh/uv
- https://nodejs.org/en/about/previous-releases

Local indexing does not transfer copyright or grant permission to redistribute the indexed material. Original source URLs, user-supplied license notes, timestamps and repository commits are retained to support provenance review.
