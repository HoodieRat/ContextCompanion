import test from 'node:test';import assert from 'node:assert/strict';
import {requestPlan,conditionSupportsRequest,passageSupportsRequest} from '../dist/support.js';
import {declaredApiContext} from '../dist/api-context.js';import {Retrieval} from '../dist/retrieval.js';
import {fixture,addProject,addSource} from './helpers.mjs';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
test('coordinated API activities retain their objects without inventing literal verb names',()=>{
 for(const activity of ['adding and accumulating values','invoking and awaiting callbacks']){
  const plan=requestPlan('How does example.reduce() differ from '+activity+'?');assert.deepEqual(plan.semanticSubjects,[]);assert(!plan.subjects.some(s=>s.includes('ing ')));
 }
 const query='How does example.reduce() differ from rounding and approximating arithmetic?',plan=requestPlan(query);assert(plan.semanticSubjects.includes('rounding and approximating arithmetic'));
 assert(passageSupportsRequest(query,'example.reduce computes accurate sums.',[],plan.semanticSubjects));
 for(const domain of ['extraterrestrial physiology','biometric coordinates'])assert(!passageSupportsRequest('How does example.reduce() differ from rounding and approximating '+domain+'?','example.reduce computes accurate sums.',[],requestPlan('How does example.reduce() differ from rounding and approximating '+domain+'?').semanticSubjects));
});
test('generic caller purpose preserves explicit state, owner, modifiers and quotations',()=>{
 const body='example.check returns True if x is a NaN and False otherwise.';
 for(const purpose of ['checking values','processing outputs','using the input'])assert(conditionSupportsRequest('What does example.check() return when '+purpose+'?',body));
 for(const purpose of ['checking encrypted biometric credentials','processing Martian gravitational fields','checking `values`','checking "values"','checking Values','checking values and the network fails','checking empty values','checking values on Mars','teleporting values'])assert(!conditionSupportsRequest('What does example.check() return when '+purpose+'?',body),purpose);
 assert(!passageSupportsRequest('What is the temperature of example.check() when checking values?',body));
 assert(!conditionSupportsRequest('What does example.check() return unless processing outputs?',body),'unless must remain a condition');
 assert(conditionSupportsRequest('What does example.check() return when x is NaN?',body));
});
test('RST data declarations retain their own scope when cross-referencing functions',()=>{
 const body='A floating-point marker value. Call example.check() to test whether a value matches this marker.';
 const source='.. module:: example\n\n.. function:: check(x)\n\n   Return True for a matching marker and False otherwise.\n\n.. data:: marker\n\n   '+body+'\n';
 const context=declaredApiContext(source,body);assert(context.identifiers.includes('example.marker'));assert(!context.identifiers.includes('example.check'));for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
});
test('a factual API query cannot borrow a cross-reference field even with high similarity',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const foreign='example.marker is a value; call example.check() to examine it.',own='example.check returns True for a matching marker and False otherwise.';
 let hits=[{url:'https://example.com/marker',content:foreign,apiContext:{identifiers:['example.marker'],declarations:[]},score:1}];
 const r=new Retrieval(f.store,{search:async()=>hits,similarities:async(q,texts)=>texts.map(()=>.99)});
 assert.equal((await r.search(p.id,'What does example.check() return when checking values?')).status,'no_results');
 hits=[{url:'https://example.com/check',content:own,apiContext:{identifiers:['example.check'],declarations:[]},score:1}];
 const ownRetrieval=new Retrieval(f.store,{search:async()=>hits,similarities:async(q,texts)=>texts.map(()=>.99)});
 assert.equal((await ownRetrieval.search(p.id,'What does example.check() return when checking values?')).status,'ok');
});
test('a foreign API cross-reference does not prevent the existing member fallback',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);const calls=[];f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const r=new Retrieval(f.store,{search:async(c,q)=>{calls.push(q);return q==='check'?[{url:'https://example.com/check',content:'Return True for a matching marker and False otherwise.',apiContext:{identifiers:['example.check','example'],declarations:[]},score:1}]:[{url:'https://example.com/marker',content:'example.marker is a value; call example.check() to examine it.',apiContext:{identifiers:['example.marker'],declarations:[]},score:1}];},similarities:async(q,texts)=>texts.map(()=>.99)});
 const result=await r.search(p.id,'What does example.check() return when checking values?');assert.equal(result.status,'ok');assert(calls.includes('check'));assert(result.hits.every(h=>h.apiContext.identifiers.includes('example.check')));
});
test('a supported short declared API section preserves the preceding definition and qualification',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const content='example.reduce returns an accurate sum by tracking intermediate partial sums.\n\n'+('The implementation retains its original arithmetic guarantees. '.repeat(9))+'\n\nThe rounding mode is half-even.';
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/reduce',content,apiContext:{identifiers:['example.reduce','example'],declarations:[],sourceExcerpt:{start:0,end:content.length}},score:1}],similarities:async(q,texts)=>texts.map(()=>.99)});
 const result=await r.search(p.id,'How does example.reduce() differ from rounding and approximating arithmetic?');assert.equal(result.status,'ok');assert(result.hits[0].content.includes('partial sums'));assert(result.hits[0].content.includes('half-even'));
});
