import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addProject, addSource } from './helpers.mjs';
import { Retrieval, exactIdentifier } from '../dist/retrieval.js';

function localProfiles(store) {
    store.update(s => {
        s.settings.embedding.kind = 'local';
        for (const c of s.collections) c.active.profile = { ...s.settings.embedding, revision: 'a'.repeat(40), dimensions: 384 };
    });
}

test('CLI flags match independently of the command sentence and retain full boundaries', () => {
    assert.ok(exactIdentifier('tool --data-dir', 'The launcher accepts --data-dir for application state.'));
    assert.equal(exactIdentifier('tool --data-dir', 'The launcher accepts --data-dir-extra.'), false);
    assert.equal(exactIdentifier('tool --data-dir', 'A label--data-dir is not an option.'), false);
});

test('same-model similarity breaks cross-source RRF ties without overriding ranks or keyword mode', async t => {
    const f = fixture(t), p = addProject(f.store, f.code), first = addSource(f.store, p); addSource(f.store, p);
    localProfiles(f.store);
    const search = async c => c.id === first.id
        ? [{ url: 'https://example.com/a', content: 'Historical attempts are retained for inspection.', score: 1 }, { url: 'https://example.com/c', content: 'A rank-two checkpoint describes another operation.', score: 1 }]
        : [{ url: 'https://example.com/z', content: 'The durable checkpoint permits completion after the commit.', score: 1 }];
    let calls = 0;
    const retrieval = new Retrieval(f.store, { search, similarities: async (query, passages, profile) => {
        calls++; assert.equal(profile.revision, 'a'.repeat(40));
        return passages.map(p => p.includes('rank-two') ? .99 : p.includes('checkpoint') ? .8 : .1);
    } });
    const result = await retrieval.search(p.id, 'When can pending work be completed?');
    assert.deepEqual(result.hits.map(h => h.url), ['https://example.com/z', 'https://example.com/a', 'https://example.com/c']);
    assert.ok(result.hits[0].scoreReasons.some(r => r.includes('not confidence')));
    const keyword = await retrieval.search(p.id, 'When can pending work be completed?', { mode: 'lexical' });
    assert.equal(calls, 1); assert.equal(keyword.hits[0].url, 'https://example.com/a');
    const outage = await new Retrieval(f.store, { search, similarities: async () => { throw new Error('worker unavailable'); } }).search(p.id, 'When can pending work be completed?');
    assert.equal(outage.hits.length, 3); assert.ok(outage.warnings.some(w => w.includes('comparison unavailable')));
});

test('revocation while cross-source comparison is pending withholds private evidence', async t => {
    const f = fixture(t), p = addProject(f.store, f.code), first = addSource(f.store, p); addSource(f.store, p);
    localProfiles(f.store);
    let finish, entered;
    const pending = new Promise(resolve => { entered = resolve; });
    const retrieval = new Retrieval(f.store, {
        search: async c => [{ url: c.id === first.id ? 'https://example.com/private' : 'https://example.com/public', content: c.id === first.id ? 'Private checkpoint details must be withheld.' : 'Public durable checkpoint information remains available.', score: 1 }],
        similarities: async () => { entered(); return new Promise(resolve => { finish = resolve; }); }
    });
    const request = retrieval.search(p.id, 'What output persists after a crash?');
    await pending; f.store.update(s => s.collections.find(c => c.id === first.id).agentAllowed = false);
    finish([.8, .9]);
    const result = await request;
    assert.deepEqual(result.hits.map(h => h.url), ['https://example.com/public']);
    assert.ok(!result.packet.includes('Private checkpoint details'));
});
