import test from 'node:test';import assert from 'node:assert/strict';
import {requestPlan,passageSupportsRequest} from '../dist/support.js';import {Retrieval} from '../dist/retrieval.js';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';import {fixture,addProject,addSource} from './helpers.mjs';
test('an API caller possessive is a grammatical role while the lock and API identity stay bound',()=>{
 const q="What does Gate.notify_all() require of the caller's lock?",body='Gate.notify_all() requires the lock to be acquired before notification.';
 assert.deepEqual(requestPlan(q).subjects,['Gate']);assert(passageSupportsRequest(q,body));
 assert.equal(passageSupportsRequest("What does Gate.notify_all() require of the caller's Mars latch?",body),false);
 assert.equal(passageSupportsRequest("What is the caller's temperature for Gate.notify_all()?",body),false);
});
test('capitalized, quoted and non-API caller owners retain their explicit identity',()=>{
 for(const q of ["What does Gate.notify_all() require of the Caller's lock?","What does Gate.notify_all() require of `the caller's lock`?","What does notification require of the caller's lock?"]){assert(requestPlan(q).subjects.some(s=>/caller/i.test(s)),q);assert.equal(passageSupportsRequest(q,'Gate.notify_all() requires the lock to be acquired.'),false,q);}
});
test('direct named-API instructions require the requested operation in one affirmative sentence',()=>{
 const q='How do I encrypt a payload with Vault.pack(data)?';
 for(const body of ['Vault.pack(data) appends data to the payload container.','Vault.pack(data) does not encrypt a payload.','Vault.pack(data) handles a payload. A separate tool encrypts data.'])assert.equal(passageSupportsRequest(q,body),false,body);
 assert(passageSupportsRequest(q,'Vault.pack(data) encrypts a payload using data from its buffer.'));
 assert.equal(passageSupportsRequest(q+' Then send data to a remote host.','Vault.pack(data) encrypts a payload using data from its buffer.'),false);
});
test('API operation parsing preserves additional goals after the member and legitimate denial questions',()=>{
 assert.equal(passageSupportsRequest('How do I encrypt a payload with Vault.pack(data) and send data to a remote host?','Vault.pack(data) encrypts a payload using data from its buffer.'),false);
 assert(passageSupportsRequest('Does Vault.pack(data) encrypt a payload?','Vault.pack(data) does not encrypt a payload.'));
 assert(passageSupportsRequest('Why does Vault.pack(data) not encrypt a payload?','Vault.pack(data) does not encrypt a payload.'));
 assert(passageSupportsRequest('How do I use Vault.pack(data)?','Vault.pack(data) appends data to the payload container.'));
 assert(passageSupportsRequest('How do I add a source?','Add a source in Settings.'));
});
test('high similarity and keyword identity cannot supply an unrelated API operation',async t=>{
 for(const local of [false,true]){const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);if(local)f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/api',content:'Vault.pack(data) appends data to the payload container.',score:1}],similarities:async(q,texts)=>texts.map(()=>.99)});const result=await r.search(p.id,'How do I encrypt a payload with Vault.pack(data)?');assert.equal(result.status,'no_results');assert.equal(result.hits.length,0);}
});
