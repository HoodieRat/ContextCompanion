import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {EmbeddingQueue} from '../dist/embedding-queue.js';import {Grounded} from '../dist/grounded.js';import {Embeddings} from '../dist/embeddings.js';import {fixture,addProject,addSource} from './helpers.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('interactive work passes waiting indexing without overlapping inference or changing results',async()=>{
 const q=new EmbeddingQueue(),gate=deferred(),order=[];let active=0,maximum=0;
 const task=(id,wait=false)=>async()=>{active++;maximum=Math.max(maximum,active);order.push(id);if(wait)await gate.promise;active--;return id;};
 const a=q.run(task('active',true)),b=q.run(task('index-1')),c=q.run(task('index-2')),query=q.run(task('query'),true);gate.resolve();
 assert.deepEqual(await Promise.all([a,b,c,query]),['active','index-1','index-2','query']);assert.deepEqual(order,['active','query','index-1','index-2']);assert.equal(maximum,1);
});
test('a bounded interactive burst preserves indexing progress',async()=>{
 const q=new EmbeddingQueue(16,2),gate=deferred(),order=[];
 const root=q.run(async()=>{await gate.promise;return 'root';}),low=q.run(async()=>{order.push('index');return 'index';});
 const queries=Array.from({length:6},(_,i)=>q.run(async()=>{order.push(i);return i;},true));gate.resolve();await Promise.all([root,low,...queries]);assert.deepEqual(order,[0,1,'index',2,3,4,5]);
});
test('queue admission counts active plus pending tasks atomically',async()=>{
 const q=new EmbeddingQueue(2),gate=deferred(),a=q.run(async()=>gate.promise),b=q.run(async()=>2);await assert.rejects(q.run(async()=>3),e=>e.status===429);gate.resolve(1);assert.deepEqual(await Promise.all([a,b]),[1,2]);assert.equal(await q.run(async()=>4),4);
});
test('cancelled and failed work cannot run or poison following requests',async()=>{
 const q=new EmbeddingQueue(),gate=deferred();let cancelled=false,entered=false;
 const a=q.run(async()=>gate.promise),b=q.run(async()=>{entered=true;return 2;},false,()=>cancelled),rejected=assert.rejects(b,e=>e.status===499);cancelled=true;gate.resolve(1);await a;await rejected;assert.equal(entered,false);await assert.rejects(q.run(async()=>{throw Error('failed task');}),/failed task/);assert.equal(await q.run(async()=>3,true),3);
});
test('Grounded read-only requests request interactive routing; external provider URL is unchanged',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code),c=addSource(f.store,p),calls=[];const entry=path.join(f.home,'runtime/docs/node_modules/@arabold/docs-mcp-server/dist/index.js');fs.mkdirSync(path.dirname(entry),{recursive:true});fs.writeFileSync(entry,'');
 const g=new Grounded(f.home,{connection:async(profile,interactive)=>{calls.push(interactive);return undefined;}});await g.options(c,c.active,true);await g.options(c,c.active,false);assert.deepEqual(calls,[true,false]);
 const external={kind:'external',baseUrl:'http://127.0.0.1:1234/v1',model:'existing',dimensions:768,revision:'existing'};const e=new Embeddings(f.home);assert.equal((await e.connection(external,true)).baseUrl,external.baseUrl);e.close();
});
