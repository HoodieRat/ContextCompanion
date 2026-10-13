import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture } from './helpers.mjs';
import { startServer } from '../dist/server.js';
import { api } from '../dist/client.js';

test('real dashboard API workflow registers, reports failed indexing, retains memory, checks and backs up', async t => {
  const f = fixture(t), running = await startServer(f.home);
  const call = (route, method = 'GET', body) => api(running.record, route, method, body);
  const wait = async target => {
    for (let i = 0; i < 300; i++) {
      const s = await call('/api/status');
      const j = s.jobs.filter(x => x.targetId === target).at(-1);
      if (j && !['queued', 'running'].includes(j.state)) return j;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Workflow job did not finish');
  };
  try {
    const registered = await call('/api/projects', 'POST', { name: 'Workflow project', root: f.code, connect: false, indexProject: false });
    const id = registered.project.id, route = `/api/projects/${id}`;
    assert.equal(registered.project.root, f.code);
    const source = await call('/api/collections', 'POST', { projectId: id, name: 'New knowledge', kind: 'note', content: 'A known local document explains the orbital adjustment procedure.', version: 'unversioned', tags: [], exclusions: [], refreshHours: 0 });
    const failed = await wait(source.id);
    assert.equal(failed.state, 'failed');
    assert.match(failed.message, /Grounded Docs is not installed/);
    const result = await call(route + '/search', 'POST', { query: 'orbital adjustment' });
    assert.equal(result.status, 'no_results');
    assert.match(result.warnings.join(' '), /not indexed/);
    const last = await call(route + '/last-retrieval');
    assert.equal(last.result.status, 'no_results');
    assert.deepEqual(last.result.warnings, result.warnings);
    assert.ok(last.at);
    assert.equal(JSON.stringify(last).includes('orbital adjustment'), false, 'Do not retain raw prompt text in retrieval inspection');
    await call(route + '/memories', 'POST', { title: 'Alternative approach', body: 'Investigate a supported implementation outside the stored catalogue.', kind: 'discovery', discoverySources: [{ url: 'https://example.com/spec' }], validationNotes: 'Reference reviewed only. No execution claimed.' });
    const memories = await call(route + '/memories');
    assert.equal(memories.length, 1);
    assert.ok(JSON.stringify(await call(route + '/handoff')).includes('Alternative approach'));
    await call(route, 'PUT', { approveCommands: true, checks: [{ name: 'Actual fixture command', command: process.execPath, args: ['-e', 'console.log("Workflow verification completed")'], timeoutSeconds: 5 }] });
    await call(route + '/checks', 'POST', {});
    assert.equal((await wait(id)).state, 'succeeded');
    const backup = await call('/api/backups', 'POST', {});
    assert.ok(backup.files.some(x => x.path === 'state.json'));
    await call(`/api/backups/${backup.id}/inspect`, 'POST', {});
    assert.ok((await call('/api/backups')).length);
    assert.equal(fs.existsSync(path.join(f.code, '.codex/config.toml')), false);
    await call(route, 'DELETE');
    assert.equal((await call('/api/status')).projects.length, 0);
    assert.ok(fs.existsSync(f.code), 'Unregister must not delete the project');
  } finally { await running.close(); }
});
