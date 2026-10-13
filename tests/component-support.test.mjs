import test from 'node:test';import assert from 'node:assert/strict';import {fixture,addProject,addSource}from'./helpers.mjs';import {Retrieval}from'../dist/retrieval.js';import {UNANCHORED_SUPPORT,requestPlan}from'../dist/support.js';
test('each descriptive object needs same-passage pinned semantic support even when the whole-query score is high',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,...UNANCHORED_SUPPORT,kind:'local'};});
 const compared=[],retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/delivery',content:'Signal delivery is postponed until the recipient requests it.',score:1}],similarities:async(q,passages)=>{compared.push(q);return passages.map(()=>q==='delayed teleportation'?.05:.8);}});
 assert.equal((await retrieval.search(p.id,'How is delayed transmission handled?')).status,'ok');
 assert.equal((await retrieval.search(p.id,'How is delayed orbital teleportation handled?')).status,'no_results');
 assert.equal((await retrieval.search(p.id,'How is delayed transmission and teleportation handled?')).status,'no_results');
 assert(compared.includes('delayed transmission'));assert(compared.includes('delayed teleportation'));
 assert(!compared.includes('delayed orbital teleportation'),'Uncorroborated literal domain modifier must block comparison even if its score would be high');
 assert.equal((await retrieval.search(p.id,'What is Caldera used for?')).status,'no_results');
 const before=compared.length;assert.equal((await retrieval.search(p.id,'How is delayed transmission handled?',{mode:'lexical'})).status,'no_results');assert.equal(compared.length,before);
 assert.equal((await retrieval.search(p.id,'How is delayed transmission handled and current capacity measured?')).status,'no_results');
});
test('short open contextual agendas require a real directive and reject appended goals',()=>{
 for(const q of ['What comes next?','What should happen next?','What should we tackle next?','What next?'])assert(requestPlan(q).attributes.some(a=>a.name==='plan'),q);
 for(const q of ['What comes next to change gravity?','What should happen next to reverse aging?','What should we tackle next on Neptune?','What next for perpetual motion?'])assert(!requestPlan(q).attributes.some(a=>a.name==='plan'),q);
});
