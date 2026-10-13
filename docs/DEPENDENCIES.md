# Dependencies, installation and redistribution

The controller has no production npm dependencies. It ships compiled JavaScript and the licensed npm semver implementation used only for npm compatibility ranges. TypeScript 5.8.3 and @types/node 24.0.4 are development-only requirements in package.json. The source includes the existing development package-lock.json; use npm ci for that graph. Installed upstream runtime lockfiles are separate and remain in the private data home.

`dependency-pins.json` is the authoritative direct-upstream pin manifest. The Windows installer installs into `%LOCALAPPDATA%\ContextCompanion\runtime`, not system site-packages or a user's AI project. It uses a private Node v24.21.0 archive, uv 0.13.0, managed Python 3.13, Grounded Docs 3.2.1, Serena at an exact commit, and Transformers.js 3.7.2. Model files resolve to an immutable Hugging Face revision on installation and are recorded. A model repository revision is not a guarantee that a platform-specific native dependency will work.

Official Node checksums and the GitHub uv asset SHA-256 are required before executable extraction. A missing digest fails closed. npm creates actual runtime package-lock.json files, which subsequent repairs reuse with npm ci. Serena requirements are compiled to a hashed lock for the installed Python platform and reused until its source pin changes. Python patch resolution, first-install transitive versions and first-install model revision are recorded rather than pretended to be an already-tested identical graph for every computer.

The installer records npm installed trees, Python freeze, installation identity and an installed license inventory. Unknown/missing license metadata is not silently labeled approved. Review THIRD_PARTY_NOTICES.md and the actual inventory before redistributing an entire runtime, especially separately licensed Serena and transitive components. The release ZIP contains neither runtime packages nor model weights.

The optional Git repository source requires Git for Windows available in PATH. The safe publisher additionally requires GitHub CLI (`gh auth login`). Those user-account tools are not installed or authenticated silently. The default local/document workflow does not need GitHub access. The optional Playwright browser download is enabled only with Install.ps1 -WithBrowser.

Sources for inspected pin/configuration contracts:
- https://github.com/arabold/docs-mcp-server/blob/v3.2.1/package.json
- https://github.com/arabold/docs-mcp-server/blob/v3.2.1/docs/guides/embedding-models.md
- https://github.com/arabold/docs-mcp-server/blob/v3.2.1/docs/setup/configuration.md
- https://github.com/oraios/serena/blob/1de556f71569f3acfc0743e526dd60aca40a545e/pyproject.toml
- https://nodejs.org/dist/index.json
- https://docs.astral.sh/uv/getting-started/installation/
- https://huggingface.co/docs/transformers.js

## A note on free/open-source scope

The integration, local retrieval components and the default embedding path use self-hostable software without requiring a paid inference service. Your existing Codex account is separate and is not replaced or supplied by this package. Optional existing local servers are compatibility endpoints, not components this installer redistributes.
