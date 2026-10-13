import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {operationSupportsRequest} from '../dist/support.js';import {Retrieval} from '../dist/retrieval.js';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';import {fixture,addProject,addSource} from './helpers.mjs';
const raw=fs.readFileSync(new URL('../evidence/windows-independent-retrieval-repair/primary/hashlib/hashlib.rst',import.meta.url),'utf8');
const update=raw.slice(raw.indexOf('.. method:: hash.update(data)'),raw.indexOf('.. method:: hash.digest()'));
test('a real API declaration cannot lend support to an undocumented operation or object',()=>{
 for(const query of ['How does hash.update compress image data?','How does hash.update encrypt data?','How does hash.update compute image dimensions?'])assert.equal(operationSupportsRequest(query,update),false,query);
 assert.equal(operationSupportsRequest('How does hash.update concatenate data before hashing?',update),true);
});
test('high similarity cannot override a missing operation goal; the source quotation remains original',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/hash-update',content:update,score:1}],similarities:async(q,texts)=>texts.map(()=>.99)});
 assert.equal((await r.search(p.id,'How does hash.update compress image data?')).status,'no_results');
 const result=await r.search(p.id,'How does hash.update concatenate data before hashing?');assert.equal(result.status,'ok');assert(update.includes(result.hits[0].content));
});
test('unanchored descriptions and unrelated question forms retain their existing support path',()=>{
 assert(operationSupportsRequest('What is deferred distribution?','Emitted messages wait until requested.'));
 assert(operationSupportsRequest('How do I add a source?','Add a source in Settings.'));
 assert(operationSupportsRequest('How does a worker remember progress?','A subscriber resumes.'));
});
