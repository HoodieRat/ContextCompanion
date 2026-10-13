import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture, addProject, addSource, off } from './helpers.mjs';
import { scan, snapshot, projectMap } from '../dist/scanner.js';
import { checkedFile, secretName, looksSecret, privateAddress, localEndpoint, publicUrl } from '../dist/security.js';
import { cleanEnvironment } from '../dist/process.js';
import { detect, parseProfile } from '../dist/detection.js';
import { gitRef } from '../dist/repositories.js';
import { normalize, weightedMean, windows } from '../dist/embedding-math.js';
import { Grounded, inventoryVersion } from '../dist/grounded.js';
import { Embeddings } from '../dist/embeddings.js';
import { hash } from '../dist/util.js';
function put(root, name, contents) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    return file;
}
test('Grounded runtime never downloads a browser during search or file ingestion', async t => {
  const f = fixture(t), p = addProject(f.store, f.code), c = addSource(f.store, p);
  const grounded = new Grounded(f.home, new Embeddings(f.home));
  put(f.home, 'runtime/docs/node_modules/@arabold/docs-mcp-server/dist/index.js', '');
  c.active.profile = off;
  for (const readOnly of [false, true]) {
    const options = await grounded.options(c, c.active, readOnly);
    assert.equal(options.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD, '1');
    assert.equal(options.env.PLAYWRIGHT_BROWSERS_PATH, path.join(f.home, 'browsers'));
    assert.equal(options.env.DOCS_MCP_STORE_PATH, path.join(grounded.generationDir(c.id, c.active.id), 'store'));
    assert.equal(JSON.parse(fs.readFileSync(options.config)).app.readOnly, readOnly);
  }
});
test('scanner excludes credentials, generated directories, archives and embedded keys', async (t) => {
    const f = fixture(t);
    put(f.code, 'guide.md', 'Safe documentation.');
    put(f.code, '.env', 'secret=private');
    put(f.code, 'credentials.json', '{}');
    put(f.code, 'node_modules/example/index.js', 'generated');
    put(f.code, 'nested/private.txt', 'ghp_' + 'B'.repeat(30));
    put(f.code, 'model.gguf', 'not a text model');
    const found = await scan(f.code);
    assert.deepEqual(found.files.map(x => x.relative), ['guide.md']);
    assert.ok(found.skipped.length >= 5);
});
test('unknown UTF8 language has usable generic staging with original path preserved', async (t) => {
    const f = fixture(t);
    put(f.code, 'code.futurelang', 'function crystalOrbit(x) returns x + 4');
    const found = await snapshot(f.code, path.join(f.root, 'staged'), [], f.home);
    assert.equal(found.files[0].relative, 'code.futurelang');
    assert.ok(found.files[0].stagedRelative.endsWith('.txt'));
    assert.match(fs.readFileSync(path.join(f.root, 'staged', found.files[0].stagedRelative), 'utf8'), /crystalOrbit/);
});
test('source fingerprint is stable for unchanged content and changes on edit/delete', async (t) => {
    const f = fixture(t), file = put(f.code, 'guide.md', 'Original document');
    const one = await scan(f.code), two = await scan(f.code);
    assert.equal(one.fingerprint, two.fingerprint);
    fs.writeFileSync(file, 'Revised document');
    const three = await scan(f.code);
    assert.notEqual(one.fingerprint, three.fingerprint);
    fs.rmSync(file);
    const four = await scan(f.code);
    assert.equal(four.files.length, 0);
    assert.notEqual(three.fingerprint, four.fingerprint);
});
test('contextignore and private application data are not staged', async (t) => {
    const f = fixture(t);
    put(f.code, '.contextignore', 'ignore-me/**\n*.secretlang\n');
    put(f.code, 'ignore-me/a.md', 'excluded');
    put(f.code, 'b.secretlang', 'excluded');
    put(f.code, 'private-home/guide.md', 'do not index');
    put(f.code, 'keep.md', 'keep');
    const found = await scan(f.code, { forbiddenRoot: path.join(f.code, 'private-home') });
    assert.deepEqual(found.files.map(x => x.relative), ['keep.md']);
});
test('scanner enforces capacity and rejects unreadable binary fallback', async (t) => {
    const f = fixture(t);
    put(f.code, 'a.md', 'A');
    put(f.code, 'b.md', 'B');
    await assert.rejects(scan(f.code, { maxFiles: 1 }), /eligible files/);
    await assert.rejects(scan(f.code, { maxTotal: 1 }), /staging limit/);
    put(f.code, 'raw.futurelang', Buffer.from([0xff, 0xff, 0xff]));
    assert.ok((await scan(f.code)).skipped.some(x => x.path === 'raw.futurelang'));
});
test('project-relative read refuses traversal and sensitive filenames', t => {
    const f = fixture(t);
    put(f.code, 'safe.md', 'safe');
    put(f.code, 'private.key', 'private');
    assert.equal(checkedFile(f.code, 'safe.md'), path.join(f.code, 'safe.md'));
    assert.throws(() => checkedFile(f.code, '../outside'), /traversal/);
    assert.throws(() => checkedFile(f.code, 'private.key'), /Sensitive/);
    assert.throws(() => checkedFile(f.code, path.resolve('/outside')), /relative/);
});
test('symlink directories cannot leak files into snapshots or reads', async (t) => {
    const f = fixture(t);
    put(f.home, 'external.md', 'outside');
    fs.symlinkSync(f.home, path.join(f.code, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal((await scan(f.code)).files.length, 0);
    assert.throws(() => checkedFile(f.code, 'link/external.md'), /links/);
    await assert.rejects(scan(path.join(f.code, 'link')), /symbolic/);
});
test('network policy rejects private literals and credential URLs without fetching', async () => {
    for (const address of ['127.0.0.1', '10.0.0.1', '172.16.5.1', '192.168.1.2', '169.254.169.254', '::1', 'fd12::1', '::ffff:127.0.0.1'])
        assert.equal(privateAddress(address), true, address);
    assert.equal(privateAddress('8.8.8.8'), false);
    await assert.rejects(publicUrl('http://localhost/private'), /Private/);
    await assert.rejects(publicUrl('https://user:password@example.com/'), /credentials/);
    await assert.rejects(publicUrl('file:///etc/passwd'), /HTTP/);
    await assert.rejects(publicUrl('https://example.com/doc?api_key=private'), /Credential-bearing/);
});
test('embedding configuration is loopback only with no query/credentials', () => {
    assert.equal(localEndpoint('http://127.0.0.1:1234/v1/'), 'http://127.0.0.1:1234/v1');
    for (const url of ['https://external.example/v1', 'http://localhost:1234/?key=secret', 'http://user:secret@localhost/v1'])
        assert.throws(() => localEndpoint(url), /must use/);
});
test('upstream process environment excludes chat API credentials', () => {
    const before = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'private-test-value';
    try {
        assert.equal(cleanEnvironment({}).OPENAI_API_KEY, undefined);
        assert.equal(cleanEnvironment({ OPENAI_API_KEY: 'local-token' }).OPENAI_API_KEY, 'local-token');
    }
    finally {
        if (before === undefined)
            delete process.env.OPENAI_API_KEY;
        else
            process.env.OPENAI_API_KEY = before;
    }
});
test('Git ref rejects options, traversal and revision expression injection', () => {
    assert.equal(gitRef('release/docs-v3'), 'release/docs-v3');
    assert.equal(gitRef('a'.repeat(40)), 'a'.repeat(40));
    for (const ref of ['--upload-pack=bad', '../main', 'main@{1}', 'main;echo bad', 'main~1'])
        assert.throws(() => gitRef(ref));
});
test('dependency detection distinguishes locked npm version from constraints', async (t) => {
    const f = fixture(t);
    put(f.code, 'package.json', JSON.stringify({ dependencies: { widget: '^2.0.0', unresolved: '^5.0.0' } }));
    put(f.code, 'package-lock.json', JSON.stringify({ packages: { 'node_modules/widget': { version: '2.3.0' } } }));
    put(f.code, 'main.ts', 'export const revision = 1');
    const result = await detect(f.code, ['package.json', 'package-lock.json', 'main.ts']);
    assert.equal(result.profile.dependencies.find(x => x.name === 'widget').resolved, '2.3.0');
    assert.equal(result.profile.dependencies.find(x => x.name === 'unresolved').confidence, 'declared');
    assert.equal(result.profile.dependencies.find(x => x.name === 'unresolved').resolved, undefined);
});
test('empty arbitrary project produces honest structural map and accepts manual technology', async (t) => {
    const f = fixture(t), p = addProject(f.store, f.code);
    const result = await projectMap(p, f.home);
    assert.equal(result.totalFiles, 0);
    assert.ok(result.warnings.length);
    const manual = parseProfile({ languages: ['MyFutureLanguage'], platforms: ['windows'], dependencies: [] });
    assert.equal(manual.languages[0], 'myfuturelanguage');
});
test('embedding math covers every token without overstating overlap weight', () => {
    const values = Array.from({ length: 701 }, (_, i) => i), parts = windows(values);
    assert.equal(parts.reduce((s, x) => s + x.weight, 0), values.length);
    assert.deepEqual([...new Set(parts.flatMap(x => x.values))], values);
    const result = weightedMean([[1, 0], [0, 1]], [1, 1]);
    assert.ok(Math.abs(result[0] - Math.SQRT1_2) < 1e-10);
    assert.throws(() => normalize([NaN, 0]), /invalid/);
    assert.throws(() => normalize([0, 0]), /zero/);
    assert.throws(() => weightedMean([[1], [1, 2]], [1, 1]), /dimensions/);
    assert.throws(() => windows(values, 20, 20), /Invalid/);
});
test('upstream inventory rejects empty/malformed/failed jobs instead of claiming indexed', () => {
    const row = count => [{ name: 'lib', versions: [{ version: '1', documentCount: count, uniqueUrlCount: count, status: 'COMPLETED' }] }];
    assert.equal(inventoryVersion(row(3), 'lib', '1').documentCount, 3);
    assert.throws(() => inventoryVersion(row(0), 'lib', '1'), /No usable/);
    assert.throws(() => inventoryVersion(row(3), 'lib', '2'), /No usable/);
    const bad = row(3);
    bad[0].versions[0].status = 'FAILED';
    assert.throws(() => inventoryVersion(bad, 'lib', '1'), /not completed/);
    assert.throws(() => inventoryVersion({}, 'lib', '1'), /shape/);
});
test('missing Grounded runtime is actionable, never a fabricated search result', async (t) => {
    const f = fixture(t), p = addProject(f.store, f.code), c = addSource(f.store, p);
    const embeds = new Embeddings(f.home), grounded = new Grounded(f.home, embeds);
    try {
        assert.equal(grounded.available(), false);
        await assert.rejects(grounded.search(c, 'topic', 5), /not installed/);
    }
    finally {
        embeds.close();
    }
});
test('direct credential heuristics recognize secrets without flagging placeholder examples', () => {
    assert.ok(secretName('config/auth.json'));
    assert.ok(looksSecret(Buffer.from('-----BEGIN PRIVATE KEY-----')));
    assert.equal(looksSecret(Buffer.from('api_key = "${TOKEN}"')), false);
    assert.equal(hash('a').length, 64);
});
