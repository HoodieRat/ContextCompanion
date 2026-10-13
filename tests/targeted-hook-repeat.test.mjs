import test from 'node:test';import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';import {Service} from '../dist/service.js';
test('each prompt hook supplies relevant evidence again while explicit searches retain session suppression',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const s=new Service(f.home);t.after(()=>s.close());
 s.grounded.search=async()=>[{url:'https://example.com/GLINT42',content:'GLINT42 registration code is TARGETEDCODE42.',score:1}];
 const body={cwd:f.code,session_id:'same-chat',hook_event_name:'UserPromptSubmit',prompt:'What is the GLINT42 registration code?'};
 for(let i=0;i<3;i++)assert((await s.hook(p.id,body)).hookSpecificOutput.additionalContext.includes('TARGETEDCODE42'));
 assert.equal((await s.retrieval.search(p.id,body.prompt,{session:'explicit'})).hits.length,1);
 assert.equal((await s.retrieval.search(p.id,body.prompt,{session:'explicit'})).hits.length,0);
});
