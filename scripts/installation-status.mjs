import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Store } from '../dist/state.js';
import { writeJson, readJson } from '../dist/util.js';
const args = process.argv.slice(2), home = args[args.indexOf('--home') + 1], keyword = args[args.indexOf('--keyword-only') + 1]?.toLowerCase() === 'true';
if (!home)
    throw new Error('--home is required');
const info = readJson(path.join(home, 'installation.json')), store = new Store(home);
store.update(s => { if (keyword)
    s.settings.embedding = { ...s.settings.embedding, kind: 'off' };
else if (s.settings.embedding.kind === 'local' && !s.settings.embedding.revision)
    s.settings.embedding.revision = info.modelRevision; });
const docs = readJson(path.join(home, 'runtime', 'docs', 'node_modules', '@arabold', 'docs-mcp-server', 'package.json'));
const pins = readJson(fileURLToPath(new URL('../dependency-pins.json', import.meta.url)));
if (docs.version !== pins.groundedDocs.version)
    throw new Error('Grounded Docs installation version does not match the release pin');
writeJson(path.join(home, 'installation-status.json'), { at: new Date().toISOString(), platform: process.platform, node: process.version, groundedVersion: docs.version, installed: true, liveVerified: false });
