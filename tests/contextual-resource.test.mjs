import test from 'node:test';import assert from 'node:assert/strict';
import{fixture,addProject,addSource}from'./helpers.mjs';import{Retrieval}from'../dist/retrieval.js';import{SUPPORT_PROFILE}from'../dist/evidence-support.js';
function setup(t,content){const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={...s.settings.embedding,...SUPPORT_PROFILE,kind:'local'};s.collections[0].active.profile=s.settings.embedding;});return{p,retrieval:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent-actors',content,score:1}],similarities:async(q,passages)=>passages.map(()=>.99)})};}
test('adjectives bound to contextual actors allow paraphrase without dropping a named actor at high cosine',async t=>{
 const{p,retrieval}=setup(t,'Expired records are dropped after their retention period.');
 assert.equal((await retrieval.search(p.id,'How do stale retained entries get removed?')).status,'ok');
 assert.equal((await retrieval.search(p.id,'How do Vega retained entries get removed?')).status,'no_results');
});
test('a descriptive stored copy is contextual while an unknown owner of that copy stays literal',async t=>{
 const{p,retrieval}=setup(t,'Preserved backups restore the database after data loss.');
 assert.equal((await retrieval.search(p.id,'How can I recover lost records from an archived copy?')).status,'ok');
 assert.equal((await retrieval.search(p.id,'How can I recover lost records from an Orion copy?')).status,'no_results');
});
