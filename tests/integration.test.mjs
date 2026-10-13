import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fixture, addProject } from './helpers.mjs';
import { mergeHooks, mcpBlock, replaceManaged, integrate, hookCommand } from '../dist/integration.js';
import { Service } from '../dist/service.js';
import { startServer } from '../dist/server.js';
import { api } from '../dist/client.js';
import { RpcClient, serveMcp, toolText } from '../dist/rpc.js';
import { spawnOwned } from '../dist/process.js';
import { APP_ROOT } from '../dist/util.js';
test('managed blocks preserve unrelated config and are idempotent', () => { const original = 'model = "existing"\n'; const once = replaceManaged(original, 'managed=true'); assert.equal(replaceManaged(once, 'managed=true'), once); assert.ok(replaceManaged(once, '').includes(original)); assert.throws(() => replaceManaged('# context-companion:begin', 'a'), /edited/); });
test('MCP commands bind absolute app/home/project paths', t => { const f = fixture(t), p = addProject(f.store, f.code), block = mcpBlock(f.home, p); assert.ok(block.includes(p.id)); assert.ok(block.includes(JSON.stringify(f.home))); assert.ok(block.includes('context_code')); assert.ok(block.includes('context_companion')); assert.ok(!block.includes('bypass')); });
test('Windows hooks encode paths with spaces and apostrophes', t => { const f = fixture(t), p = addProject(f.store, f.code); const c = hookCommand("C:\\Jam's Files\\Context", p.id, 'C:\\Node Runtime\\node.exe', "C:\\Jam's App"); const script = Buffer.from(c.commandWindows.split(' ').at(-1), 'base64').toString('utf16le'); assert.match(script, /Jam''s/); assert.match(script, /Hook.ps1/); assert.ok(script.includes(p.id)); });
test('hook merging preserves unrelated handlers and removes only owned handlers', t => { const f = fixture(t), p = addProject(f.store, f.code), original = { description: 'existing', hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'other.exe', statusMessage: 'Other' }] }] } }; const once = mergeHooks(original, f.home, p, true), twice = mergeHooks(once, f.home, p, true); assert.deepEqual(once, twice); assert.equal(twice.hooks.SessionStart.length, 2); assert.equal(mergeHooks(twice, f.home, p, false).hooks.SessionStart.length, 1); });
test('real AGENTS/TOML integration and unlink preserve user content', async (t) => { const f = fixture(t), p = addProject(f.store, f.code); fs.mkdirSync(path.join(f.code, '.codex')); fs.writeFileSync(path.join(f.code, '.codex', 'config.toml'), 'model = "existing"\n'); fs.writeFileSync(path.join(f.code, 'AGENTS.md'), '# Existing project guidance\n'); await integrate(f.home, p, true); const agents = fs.readFileSync(path.join(f.code, 'AGENTS.md'), 'utf8'); assert.ok(agents.includes('accelerator')); assert.ok(agents.includes('Existing project guidance')); assert.equal((await integrate(f.home, p, true)).files.length, 0); await integrate(f.home, p, false); assert.ok(!fs.readFileSync(path.join(f.code, 'AGENTS.md'), 'utf8').includes('## Context Companion')); assert.ok(fs.readFileSync(path.join(f.code, '.codex', 'config.toml'), 'utf8').includes('existing')); });
test('reserved server conflict causes no partial config writes', async (t) => { const f = fixture(t), p = addProject(f.store, f.code); fs.mkdirSync(path.join(f.code, '.codex')); const config = '[mcp_servers.context_companion]\ncommand="existing"'; fs.writeFileSync(path.join(f.code, '.codex', 'config.toml'), config); await assert.rejects(integrate(f.home, p, true), /reserved/); assert.equal(fs.readFileSync(path.join(f.code, '.codex', 'config.toml'), 'utf8'), config); assert.equal(fs.existsSync(path.join(f.code, 'AGENTS.md')), false); });
test('hook requires matching cwd and encourages outside research', async (t) => { const f = fixture(t), p = addProject(f.store, f.code), svc = new Service(f.home); t.after(() => svc.close()); await assert.rejects(svc.hook(p.id, { hook_event_name: 'SessionStart', session_id: 'x' }), /cwd/); await assert.rejects(svc.hook(p.id, { hook_event_name: 'SessionStart', session_id: 'x', cwd: f.home }), /working folder/); const r = await svc.hook(p.id, { hook_event_name: 'SessionStart', session_id: 'x', cwd: f.code }); assert.equal(r.hookSpecificOutput.hookEventName, 'SessionStart'); assert.match(r.hookSpecificOutput.additionalContext, /accelerator|exhaustive/); assert.equal(r.continue, undefined); });
test('MCP schemas reject foreign project arguments and incomplete findings', async (t) => { const f = fixture(t), p = addProject(f.store, f.code), svc = new Service(f.home); t.after(() => svc.close()); await assert.rejects(svc.mcp(p.id, 'context_project', { projectId: 'other' }), /not supported/); await assert.rejects(svc.mcp(p.id, 'context_record_finding', { title: 'A', body: 'B' }), /required/); const r = await svc.mcp(p.id, 'context_record_finding', { title: 'Outside approach', body: 'Compare alternatives', discoverySources: [{ url: 'https://example.com/spec' }], validationNotes: 'Reviewed, not executed.' }); assert.equal(JSON.parse(r.content[0].text).status, 'proposed'); });
test('memory paging keeps whole serialized response within budget', async (t) => { const f = fixture(t), p = addProject(f.store, f.code); f.store.update(s => s.projects[0].budget = 500); const svc = new Service(f.home); t.after(() => svc.close()); const m = svc.remember(p.id, { title: 'Long', body: '"\\🧪'.repeat(1200) }); const list = await svc.mcp(p.id, 'context_memories', {}); assert.ok(Buffer.byteLength(JSON.stringify(list)) <= 1500); const page = await svc.mcp(p.id, 'context_memory_read', { memoryId: m.id, offset: 0 }); assert.ok(Buffer.byteLength(JSON.stringify(page)) <= 1500); assert.ok(JSON.parse(page.content[0].text).nextOffset > 0); });
test('real HTTP authentication, origin policy and static asset serving', async (t) => { const f = fixture(t), p = addProject(f.store, f.code), s = await startServer(f.home); try {
    const base = `http://127.0.0.1:${s.record.port}`;
    assert.equal((await fetch(base + '/')).status, 200);
    assert.equal((await fetch(base + '/app.js')).status, 200);
    assert.equal((await fetch(base + '/api/status')).status, 401);
    assert.equal((await fetch(base + '/api/status', { headers: { Authorization: 'Bearer ' + s.record.token, Origin: 'https://malicious.example' } })).status, 403);
    assert.equal((await api(s.record, '/api/status')).projects[0].id, p.id);
    assert.equal((await fetch(base + '/anything')).status, 404);
}
finally {
    await s.close();
} });
test('actual MCP stdio process saves evidence and recovers across controller restart', async (t) => { const f = fixture(t), p = addProject(f.store, f.code); let s = await startServer(f.home), rpc; try {
    const child = spawnOwned(process.execPath, [path.join(APP_ROOT, 'dist', 'cli.js'), 'mcp', '--home', f.home, '--project', p.id], { cwd: APP_ROOT });
    let errors = '';
    child.stderr.on('data', x => errors += x);
    rpc = new RpcClient(child);
    await rpc.initialize();
    const tools = await rpc.request('tools/list');
    assert.ok(tools.tools.some(x => x.name === 'context_record_finding'));
    const marker = 'CC_MCP_REAL_846239';
    const saved = await rpc.request('tools/call', { name: 'context_record_finding', arguments: { title: 'Transport finding', body: marker, discoverySources: [{ url: 'https://example.com/spec' }], validationNotes: 'Only transport exercised.' } });
    assert.ok(!saved.isError, errors);
    const results = await rpc.request('tools/call', { name: 'context_memories', arguments: {} });
    assert.ok(results.content[0].text.includes(marker));
    const invalid = await rpc.request('tools/call', { name: 'context_search', arguments: { query: 'topic', projectId: 'other' } });
    assert.equal(invalid.isError, true);
    await s.close();
    s = await startServer(f.home);
    const rebound = await rpc.request('tools/call', { name: 'context_project', arguments: {} });
    assert.ok(!rebound.isError, errors);
    assert.ok(rebound.content[0].text.includes(p.id));
    const retained = await rpc.request('tools/call', { name: 'context_memories', arguments: {} });
    assert.ok(retained.content[0].text.includes(marker));
    const stillBound = await rpc.request('tools/call', { name: 'context_project', arguments: { projectId: 'other' } });
    assert.equal(stillBound.isError, true);
}
finally {
    rpc?.close();
    await s.close();
} });
test('malformed cancellation notifications do not crash the MCP server', async () => { const input = new PassThrough(), output = new PassThrough(); let captured = ''; output.on('data', x => captured += x); const serving = serveMcp({ name: 'test', version: '1', instructions: '', input, output, list: async () => [], call: async () => toolText({}) }); input.write('{"jsonrpc":"2.0","method":"notifications/cancelled","params":4}\n'); input.write('{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}\n'); await new Promise(r => setTimeout(r, 30)); input.end(); await serving; assert.match(captured, /serverInfo/); });
