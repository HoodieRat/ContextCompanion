import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Retrieval} from '../dist/retrieval.js';
import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
import {communicationSupport} from '../dist/support.js';

function setup(t,content){
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 // High whole-query resemblance cannot supply an independently unsupported
 // appended concept. The real-model negative is also checked in the live probe.
 return {p,r:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent-emission',content,score:1}],similarities:async(q,texts)=>texts.map(()=>q==='buffered resurrection'?.05:.99)})};
}

test('delayed emissions and buffered values support communication paraphrases',async t=>{
 for(const [query,content] of [
  ['What is deferred transmission?','Delays the emission of items until a specified date.'],
  ['What is buffered distribution?','Collects values as an array, then emits those arrays periodically.'],
  ['What is queued delivery?','The queue holds events until it emits them to a subscriber.'],
  ['What is staged forwarding?','The buffer collects notifications, then emits them to a listener.'],
 ]){const {p,r}=setup(t,content);const result=await r.search(p.id,query);assert.equal(result.status,'ok',query);assert.equal(result.hits[0].content,content);}
});

test('emission wording cannot borrow absent behavior, owners, fields or another component',async t=>{
 for(const [query,content] of [
  ['What is buffered distribution?','Values are emitted immediately. There is no buffer or queue.'],
  ['What is deferred transmission?','The source never emits items.'],
  ['What is deferred transmission?','The timer waits until tomorrow.\n\nA different source emits items immediately.'],
  ['What is deferred orbital transmission?','Delays the emission of items until a specified date.'],
  ['What is buffered distribution and resurrection?','Collects values as an array, then emits those arrays periodically.'],
  ['What is the capacity of Vega?','Collects values as an array, then emits those arrays periodically.'],
 ]){const {p,r}=setup(t,content);assert.equal((await r.search(p.id,query)).status,'no_results',query);}
});

test('recognizing emitted data does not change the meaning of buffered or queued',()=>{
 assert.equal(communicationSupport('distribution','buffered distribution','Emits values after a delay.'),false);
 assert.equal(communicationSupport('delivery','queued delivery','Collects values in memory and emits them periodically.'),false);
});
