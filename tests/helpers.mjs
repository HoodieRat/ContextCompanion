import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Store, DEFAULT_METADATA } from '../dist/state.js';
import { id, now } from '../dist/util.js';
export const off = { kind: 'off', model: '', dimensions: 384, revision: '', baseUrl: '' };
export function fixture(t) { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-tests-')), home = path.join(root, 'data'), code = path.join(root, 'project'); fs.mkdirSync(code); const store = new Store(home); store.update(s => s.settings.embedding = off); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return { root, home, code, store }; }
export function addProject(store, root, name = 'Example') { const p = { id: id(), name, root, collections: [], budget: 3000, maxSources: 8, hooks: true, linked: false, checks: [], createdAt: now(), profile: { languages: [], platforms: [], dependencies: [], apiFamily: '' } }; store.update(s => s.projects.push(p)); return p; }
export function addSource(store, p, extra = {}) { const c = { id: id(), name: 'Library', version: '1.0.0', tags: [], ownerProjectId: p.id, source: { kind: 'url', url: 'https://example.com/docs' }, maxPages: 100, maxDepth: 3, refreshHours: 0, exclusions: [], scrapeMode: 'fetch', createdAt: now(), metadata: { ...DEFAULT_METADATA }, agentAllowed: true, enabled: true, revision: 1, active: { id: id(), createdAt: now(), profile: off, sourceFingerprint: 'test', files: 1, skipped: 0, lastGood: true, sourceRevision: 1 }, ...extra }; store.update(s => { s.collections.push(c); s.projects.find(x => x.id === p.id).collections.push(c.id); }); return c; }
export async function waitJob(jobs, store, jobId) { for (let i = 0; i < 300; i++) {
    const j = store.data.jobs.find(j => j.id === jobId);
    if (j && !['queued', 'running'].includes(j.state))
        return j;
    await new Promise(r => setTimeout(r, 10));
} throw new Error('Job did not finish within the focused test deadline'); }
