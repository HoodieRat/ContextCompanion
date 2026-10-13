import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addProject, addSource } from './helpers.mjs';
import { Retrieval } from '../dist/retrieval.js';
import { hasTopicSupport, UNANCHORED_SUPPORT } from '../dist/support.js';

test('literal topic support survives harmless Markdown escapes and unrelated exclusions without borrowing semantic aliases', async t => {
    const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
    f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
    let content='A parcel sorting guide describes shipment preparation. Decorative footer: :folio\\_mark:.';
    let comparisons=0;
    const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reference',content,score:1}],similarities:async()=>{comparisons++;throw new Error('Lexical retrieval must not call embeddings');}});
    assert.equal((await retrieval.search(p.id,'parcel sorting',{mode:'lexical'})).status,'ok');
    assert.equal((await retrieval.search(p.id,'glacier sorting',{mode:'lexical'})).status,'no_results');
    content='A linen weaving guide describes cloth preparation. The reference does not cover glacier weaving.';
    assert.equal((await retrieval.search(p.id,'linen weaving',{mode:'lexical'})).status,'ok');
    assert.equal((await retrieval.search(p.id,'glacier weaving',{mode:'lexical'})).status,'no_results');
    content='An exclusive lease renews ownership before its deadline.';
    assert.equal(hasTopicSupport('keep locks from expiring',[content]),true);
    assert.equal(hasTopicSupport('keep locks from expiring',[content],[],false),false);
    assert.equal((await retrieval.search(p.id,'keep locks from expiring',{mode:'lexical'})).status,'no_results');
    assert.equal(comparisons,0);
});
