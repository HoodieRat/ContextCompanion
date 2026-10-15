import test from 'node:test';import assert from 'node:assert/strict';import {Retrieval} from '../dist/retrieval.js';import {fixture,addProject,addSource} from './helpers.mjs';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
test('a unit-proved short declared section retains its preceding definition',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const content='example.reduce produces precise intermediate partial sums.\n\n'+('The documented implementation retains its original guarantees. '.repeat(8))+'\n\nThe rounding mode follows the stated arithmetic guarantees.';
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reduce',content,apiContext:{identifiers:['example.reduce','example'],declarations:[],sourceExcerpt:{start:0,end:content.length}},score:1}],similarities:async(q,texts)=>texts.map(text=>text===content?0:.99)});
 const result=await r.search(p.id,'How does example.reduce() differ from rounding and approximating arithmetic?');assert.equal(result.status,'ok');assert(result.hits[0].content.includes('partial sums'));assert(result.hits[0].content.includes('rounding mode'));assert.equal(result.hits[0].content,content);
});
