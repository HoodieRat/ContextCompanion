import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';
import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
const cases=JSON.parse(fs.readFileSync(new URL('../evidence/windows-targeted-fixes/independent-development.json',import.meta.url))).cases;
function setup(t,text,similarities){const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});return{p,r:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent',content:text,score:1}],similarities})};}
test('delivery paraphrases require the payload, action and requested behavior in one paragraph',async t=>{
 for(const item of cases.filter(c=>['I01','I03','I05','I07','I08','I09','I10'].includes(c.id))){
  const {p,r}=setup(t,item.text,async(q,texts)=>texts.map(()=>item.expected==='ok'?.30:.99));
  assert.equal((await r.search(p.id,item.query)).status,item.expected,item.id);
 }
});
test('high modifier resemblance cannot establish an absent one-word concept',async t=>{
 for(const item of cases.filter(c=>['I02','I04','I06'].includes(c.id))){
  const {p,r}=setup(t,item.text,async(q,texts)=>texts.map(()=>q.includes(' ')? .99:.05));
  assert.equal((await r.search(p.id,item.query)).status,'no_results',item.id);
 }
});
