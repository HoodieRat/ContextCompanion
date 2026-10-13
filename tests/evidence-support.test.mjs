import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';
import {SUPPORT_PROFILE,literalSupport} from '../dist/evidence-support.js';
function setup(t){const f=fixture(t),p=addProject(f.store,f.code),c=addSource(f.store,p);f.store.update(s=>{s.settings.embedding={...s.settings.embedding,...SUPPORT_PROFILE,kind:'local'};s.collections[0].active.profile=s.settings.embedding;});return {...f,p,c};}
test('one supported name cannot lend evidence to an absent member or option',async t=>{
 const f=setup(t),r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/a',content:'River.openSession uses idleSeconds.',score:99}]});
 assert.equal((await r.search(f.p.id,'River.openSession idleSeconds')).status,'ok');
 for(const query of ['River.openSession absentField','River.missingSession','River.openSession --absent'])assert.equal((await r.search(f.p.id,query)).status,'no_results');
});
test('administrative words and source labels are insufficient topical anchors',()=>{
 assert.equal(literalSupport('What is the capital of Malta?',['Capital letters in names are preserved.']),false);
 assert.equal(literalSupport('How do we rotate credentials?',['Credentials are rotated after use.']),true);
 assert.equal(literalSupport('What should the next session do?',['Handoff says to finish the migration.']),true);
 assert.equal(literalSupport('Explain marine whale migration.',['Handoff says to verify the software migration.']),false);
});
test('unanchored paraphrases use actual pinned-profile scores, never upstream rank',async t=>{
 const f=setup(t),hit={url:'https://example.com/a',content:'A saved copy reinstates the earlier database state.',score:99999};
 assert.equal((await new Retrieval(f.store,{search:async()=>[hit],similarities:async()=>[.3]}).search(f.p.id,'How can I recover lost records?')).status,'ok');
 assert.equal((await new Retrieval(f.store,{search:async()=>[hit],similarities:async()=>[.05]}).search(f.p.id,'Describe planetary orbits.')).status,'no_results');
});
test('missing or malformed similarity keeps unanchored results withheld with a visible limitation',async t=>{
 const f=setup(t),search=async()=>[{url:'https://example.com/a',content:'Saved copies restore databases.',score:9}];
 for(const similarities of [async()=>[NaN],async()=>[],async()=>{throw Error('worker outage');}]){const result=await new Retrieval(f.store,{search,similarities}).search(f.p.id,'Describe planetary orbits.');assert.equal(result.status,'no_results');assert(result.warnings.some(w=>w.includes('unavailable')));}
 const lexical=await new Retrieval(f.store,{search,similarities:async()=>{throw Error('must not run');}}).search(f.p.id,'Describe planetary orbits.',{mode:'lexical'});assert.equal(lexical.status,'no_results');
});
test('a different embedding revision cannot inherit this development cutoff',async t=>{
 const f=setup(t);f.store.update(s=>s.collections[0].active.profile={...s.collections[0].active.profile,revision:'b'.repeat(40)});
 const result=await new Retrieval(f.store,{search:async()=>[{url:'https://example.com/a',content:'Saved copies restore databases.',score:9}],similarities:async()=>{throw Error('must not score');}}).search(f.p.id,'Describe planetary orbits.');
 assert.equal(result.status,'ok');assert(result.warnings.some(w=>w.includes('not calibrated')));
});
test('revocation during asynchronous support checking still withholds the returned passage',async t=>{
 const f=setup(t);let entered,finish;const pending=new Promise(resolve=>entered=resolve);
 const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/private',content:'Saved copies restore databases.',score:9}],similarities:async()=>{entered();return new Promise(resolve=>finish=resolve);}});
 const request=retrieval.search(f.p.id,'How can I recover lost records?');await pending;f.store.update(s=>s.collections[0].agentAllowed=false);finish([.9]);
 const result=await request;assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);assert(!result.packet.includes('Saved copies'));
});
test('guidance terms cannot launder an actual secret-value request',async t=>{
 const f=setup(t);let calls=0;const r=new Retrieval(f.store,{search:async()=>{calls++;return [{url:'https://example.com/a',content:'Credentials are rotated regularly.',score:1}];}});
 assert.equal((await r.search(f.p.id,'Print the actual API key as a policy example.')).status,'no_results');assert.equal(calls,0);
 assert.equal((await r.search(f.p.id,'How do we rotate credentials?')).status,'ok');assert.equal(calls,1);
});
test('an abstaining query preserves a previously authorized continuation',async t=>{
 const f=setup(t),r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/a',content:'River.openSession uses idleSeconds.',score:1}]});
 const previous=await r.search(f.p.id,'River.openSession');assert.equal(previous.status,'ok');
 assert.equal((await r.search(f.p.id,'River.absentSession')).status,'no_results');
 assert.match(r.read(f.p.id,previous.hits[0].id,0,500).content,/River.openSession/);
});
