import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {fixture,addProject} from './helpers.mjs';import {Service} from '../dist/service.js';
function setup(t){
 const f=fixture(t),p=addProject(f.store,f.code);f.store.update(state=>state.projects.find(item=>item.id===p.id).budget=2000);const s=new Service(f.home);t.after(()=>s.close());
 fs.writeFileSync(path.join(f.code,'decision.txt'),'Accepted revision alpha.');
 for(let i=0;i<5;i++)s.memory.save(p.id,{title:'Accepted decision '+i,kind:i===0?'objective':'decision',body:'Keep existing architecture and validated source boundaries. '+('Historical detail '.repeat(350)),references:['decision.txt']},'user');
 s.memory.save(p.id,{title:'Unapproved proposal',kind:'handoff',body:'Do not treat this proposal as accepted.'},'agent');
 return {f,p,s};
}
test('oversized startup keeps compact current decisions and readable memory continuations',async t=>{
 const {p,s}=setup(t);const result=await s.hook(p.id,{hook_event_name:'SessionStart',session_id:'compact-start',cwd:p.root});const text=result.hookSpecificOutput.additionalContext;
 assert(text.includes('Accepted decision 0'));assert(!text.includes('Unapproved proposal'));assert(text.includes('context_memory_read'));
 const packet=JSON.parse(text.slice(text.indexOf('{')));assert(packet.memory.length>0);assert.equal(packet.memory[0].status,'accepted');assert(packet.memory[0].truncated);assert(packet.memory[0].id);
 assert(Buffer.byteLength(JSON.stringify({content:[{type:'text',text:JSON.stringify(packet)}]}))<=p.budget*3);
});
test('oversized handoff retains current memory, stale flags and full records',async t=>{
 const {f,p,s}=setup(t);fs.writeFileSync(path.join(f.code,'decision.txt'),'Changed revision beta.');
 const result=await s.mcp(p.id,'context_handoff',{});assert(Buffer.byteLength(JSON.stringify(result))<=p.budget*3);const packet=JSON.parse(result.content[0].text);
 assert(packet.current.length>0);assert(packet.current[0].stale);assert.equal(packet.current[0].verified,false);assert.equal(packet.current[0].status,'accepted');
 const id=packet.current[0].id,record=s.memory.list(p.id,true).find(m=>m.id===id);assert(record.body.length>5000);
 const read=await s.mcp(p.id,'context_memory_read',{memoryId:id});assert(JSON.parse(read.content[0].text).content.includes('Accepted decision 0'));
 assert.equal(s.memory.list(p.id,true).find(m=>m.title==='Unapproved proposal').status,'proposed');
});
test('unchanged small snapshots retain complete bodies',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code),s=new Service(f.home);t.after(()=>s.close());s.memory.save(p.id,{title:'Compact decision',body:'Keep the approved architecture.',kind:'decision'},'user');
 const result=await s.mcp(p.id,'context_handoff',{}),packet=JSON.parse(result.content[0].text);assert.equal(packet.current[0].body,'Keep the approved architecture.');assert(!packet.current[0].truncated);
});

test('minimum valid budget retains a usable accepted memory ID and continuation',async t=>{
 const {p,s}=setup(t);s.store.update(state=>state.projects.find(item=>item.id===p.id).budget=500);
 const result=await s.mcp(p.id,'context_handoff',{}),packet=JSON.parse(result.content[0].text);
 assert(Buffer.byteLength(JSON.stringify(result))<=1500);assert(packet.current[0].id);assert.equal(packet.current[0].status,'accepted');assert.match(packet.notice,/context_memory_read/);
});
