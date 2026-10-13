import test from 'node:test';
import assert from 'node:assert/strict';
import {groundedQuery,instructionRequest} from '../dist/grounded.js';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';

test('instruction questions preserve the full operation, version and explicit option',()=>{
 const task='configure Widget.open version 2.3 on Windows with --retry-delay and cancellation';
 assert.equal(groundedQuery('How do I '+task+'?'),task);
 assert.equal(groundedQuery('How can we '+task+'?'),task);
 assert.equal(groundedQuery('How should you '+task+'?'),task);
 for(const wrap of ['**','__','*'])assert.equal(groundedQuery(wrap+'How do I '+task+'?'+wrap+'  \n'),task);
 assert.equal(instructionRequest('**How do I '+task+'?**  \n'),'How do I '+task+'?');
 assert.equal(instructionRequest('**How do I '+task+'**  ?\n'),'How do I '+task+'?');
});
test('factual requests, quoted topics and incomplete questions are not rewritten',()=>{
 for(const query of ['Which call creates a session in NacreKit version 2?','How long does a lease remain valid?','What is deferred distribution?','`How do I`','How do I ?'])
  assert.equal(groundedQuery(query),query);
});

test('instruction evidence precedes an incidental status match without overriding identifier ranking',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const search=async()=>[
  {url:'https://example.com/status',content:'Automated backups were enabled in the historical status report.',score:1},
  {url:'https://example.com/setup',content:'Enable automated backups in Settings. Changes apply to the next scheduled backup.',score:1}
 ];
 const r=new Retrieval(f.store,{search});
 assert.equal((await r.search(p.id,'How do I enable automated backups?')).hits[0].url,'https://example.com/setup');
 assert.equal((await r.search(p.id,'**How do I enable automated backups?**  \n')).hits[0].url,'https://example.com/setup');
 assert.equal((await r.search(p.id,'**How do I enable automated backups**  ?\n')).hits[0].url,'https://example.com/setup');
 assert.equal((await r.search(p.id,'backup reference')).hits[0].url,'https://example.com/status');
});
