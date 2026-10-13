import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';
import {groundedQuery} from '../dist/grounded.js';
import * as support from '../dist/evidence-support.js';
import {requestPlan} from '../dist/support.js';
const documents={jobs:'Pending jobs are requeued when their lease expires. Lease expiration preserves committed outputs.',notices:'Subscriber notices are retained when the subscriber disconnects. Notices remain readable in the local journal.'};
test('keyword candidates must pass literal support rather than inherit upstream rank',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);let text='Software migration is described in an experiment.';
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reference',content:text,score:99}]});
 assert.equal((await r.search(p.id,'Explain marine whale migration.')).status,'no_results');
 text='Add a repository in Settings. Choose a branch and click Add and index.';
 assert.equal((await r.search(p.id,'How do I add a repository?')).status,'ok');
});
test('keyword lifecycle support binds the object and condition in the returned passage',()=>{
 for(const [q,text]of [['What happens to pending jobs when their lease expires?',documents.jobs],['What happens to subscriber notices when the subscriber disconnects?',documents.notices]])assert.equal(support.keywordSupport(q,[text],groundedQuery(q)),true);
 for(const [q,text]of [['What happens to compressed attachments when their lease expires?',documents.jobs],['What happens to revoked permits when the subscriber disconnects?',documents.notices],['What happens to pending jobs when their lease is extended?',documents.jobs]])assert.equal(support.keywordSupport(q,[text],groundedQuery(q)),false);
 assert.equal(support.keywordSupport('What happens to pending jobs when their lease expires?',['Pending jobs are requeued.','A lease expires.'],groundedQuery('What happens to pending jobs when their lease expires?')),false);
});
test('keyword-only retrieval with shared condition cannot lend an absent object',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const r=new Retrieval(f.store,{search:async()=>Object.values(documents).map((content,i)=>({url:'https://example.com/reference/'+i,content,score:99}))});
 assert.equal((await r.search(p.id,'What happens to revoked permits when the subscriber disconnects?')).status,'no_results');
 const positive=await r.search(p.id,'What happens to subscriber notices when the subscriber disconnects?');assert.equal(positive.status,'ok');assert(positive.hits.every(h=>h.content===documents.notices));
});
test('keyword support keeps polar restrictions and identifier spelling checks',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reference',content:'The controller does not refresh sources when it is stopped. Module.open is available.',score:99}]});
 assert.equal((await r.search(p.id,'Does the controller refresh sources when it is stopped?')).status,'ok');
 assert.equal((await r.search(p.id,'When is Module.close available?')).status,'no_results');
});
test('a lifecycle expiration condition is not a duration field; explicit fields remain bound',()=>{
 assert.deepEqual(requestPlan('What happens to pending jobs when their lease expires?').attributes,[]);
 assert(requestPlan('How long is a lease valid?').attributes.some(a=>a.name==='time'));
 assert(requestPlan('What happens to the timeout when a job retries?').attributes.some(a=>a.name==='time'));
 assert.equal(support.keywordSupport('checkpoint',['An authorized source remains available.']),false);
});
test('lifecycle field questions keep the object and condition, while topic navigation retains its scope',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reference',content:'The timeout doubles when a job retries. An authorized source remains available.',score:99}]});
 assert.equal((await r.search(p.id,'What happens to the timeout when a job retries?')).status,'ok');
 assert.equal((await r.search(p.id,'What happens to the timeout when a spacecraft launches?')).status,'no_results');
 assert.equal((await r.search(p.id,'checkpoint')).status,'ok');
 assert.equal((await r.search(p.id,'checkpoint',{mode:'lexical'})).status,'no_results');
});
