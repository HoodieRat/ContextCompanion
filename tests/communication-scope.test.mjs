import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';
import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
import {communicationDefinitionSupport} from '../dist/support.js';

function setup(t,content,score=.3){
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 return {p,r:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent-communication',content,score:1}],similarities:async(q,texts)=>texts.map(()=>q==='buffered resurrection'?.05:score)})};
}

test('general communication and dispatch descriptions use documented transfer behavior',async t=>{
 for(const [query,content] of [
  ['What is staged communication?','Collects values in memory and emits the array periodically.'],
  ['What is deferred dispatch?','Delays the emission of items until a specified date.'],
  ['What is delayed communication?','The producer waits to send messages until demand arrives.'],
 ]){const {p,r}=setup(t,content);assert.equal((await r.search(p.id,query)).status,'ok',query);}
});

test('complete bounded definitions survive low relevance; extra requests and lexical mode retain their gates',async t=>{
 const content='Collects values in memory and emits the array periodically.';
 const {p,r}=setup(t,content,.01);
 assert.equal((await r.search(p.id,'What is staged communication?')).status,'ok');
 for(const query of ['What is staged communication and levitation?','What is staged communication for Vega?','What is staged communication before levitating?','Why is staged communication useful?']){
  assert.equal(communicationDefinitionSupport(query,content),false,query);
  assert.equal((await r.search(p.id,query)).status,'no_results',query);
 }
 assert.equal((await r.search(p.id,'What is staged communication?',{mode:'lexical'})).status,'no_results');
});

test('general communication descriptions retain behavior, domain and identifier requirements',async t=>{
 for(const [query,content] of [
  ['What is queued dispatch?','The producer sends messages immediately; no queue is used.'],
  ['What is staged communication?','The source emits values immediately, without a buffer.'],
  ['What is delayed communication?','The producer never sends messages.'],
  ['What is delayed communication?','A timer waits until tomorrow.\n\nA separate producer sends messages immediately.'],
  ['What is deferred orbital dispatch?','Delays the emission of items until a specified date.'],
  ['What is staged communication and resurrection?','Collects values in memory and emits the array periodically.'],
  ['How does dispatch() delay communication?','Delays the emission of items until a specified date.'],
 ]){const {p,r}=setup(t,content);assert.equal((await r.search(p.id,query)).status,'no_results',query);}
});

test('queued transfer can be documented by retained payloads awaiting release, without borrowing unrelated storage',async t=>{
 for(const [content,expected] of [
  ['Buffers incoming values until a notifier emits, then emits the buffer.', 'ok'],
  ['Holds notifications until a subscriber asks, then emits those notifications.', 'ok'],
  ['Collects values in memory and emits them periodically.', 'no_results'],
  ['The producer waits to emit values, without a buffer or queue.', 'no_results'],
  ['A file is held until recovery.\n\nAnother producer emits values immediately.', 'no_results'],
 ]){const {p,r}=setup(t,content,.01);assert.equal((await r.search(p.id,'What is queued transmission?')).status,expected,content);}
});
