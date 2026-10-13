import test from 'node:test';import assert from 'node:assert/strict';
import{fixture,addProject,addSource}from'./helpers.mjs';import{Retrieval}from'../dist/retrieval.js';import{SUPPORT_PROFILE}from'../dist/evidence-support.js';import*as support from'../dist/support.js';
function setup(t,content,similarities){const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={...s.settings.embedding,...SUPPORT_PROFILE,kind:'local'};s.collections[0].active.profile=s.settings.embedding;});return{p,retrieval:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent-span',content,score:1}],similarities})};}
const filler=Array.from({length:45},(_,i)=>`Routine inventory paragraph ${i} reports administrative labels.`).join('\n\n');
test('descriptive components use the same returned window and quote the proven original span',async t=>{
 const fact='The durable log retains a location. Following interruption, a worker recovers that location.',content=filler+'\n\n'+fact;
 const{p,retrieval}=setup(t,content,async(q,texts)=>texts.map(s=>s.length<400&&s.includes('recovers')?.7:.01));
 const r=await retrieval.search(p.id,'How is a recorded location recovered after interruption?');
 assert.equal(r.status,'ok');assert(r.hits[0].content.includes('recovers'));assert.equal(content.slice(r.hits[0].excerptOffset,r.hits[0].excerptOffset+r.hits[0].content.length),r.hits[0].content);
 assert.equal(r.hits[0].originalCharacters,content.length);assert.equal(r.hits[0].excerptComplete,false);assert.equal(retrieval.read(p.id,r.hits[0].id,0,12000).totalCharacters,content.length);
});
test('a definition topic can use its short span; an added component still needs its own proof',async t=>{
 const{p,retrieval}=setup(t,'A producer waits to give emitted messages to a caller until demand arrives.',async(q,texts)=>texts.map(s=>q==='deferred distribution'?(s.length<60?.45:.25):q==='deferred resurrection'?.05:.3));
 assert.equal((await retrieval.search(p.id,'What is deferred distribution?')).status,'ok');
 assert.equal((await retrieval.search(p.id,'What is deferred distribution and resurrection?')).status,'no_results');
});
test('whole-query relevance cannot certify separate components using different windows',async t=>{
 const content='Delivery of emitted signals waits for a caller. '+filler+' Living bodies would undergo resurrection in another unrelated topic.';
 const{p,retrieval}=setup(t,content,async(q,texts)=>texts.map(s=>s.length>500?.01:q==='delayed transmission'?(s.includes('Delivery')?.8:.01):q==='delayed resurrection'?(s.includes('bodies')?.8:.01):.8));
 assert.equal((await retrieval.search(p.id,'How is delayed transmission and resurrection handled?')).status,'no_results');
});
test('focused windows preserve raw Markdown spelling and exact source offsets',()=>{
 const text=filler+'\n\nThe durable location is read from `saved_offset`. A worker recovers the location.';
 const spans=support.semanticSupportSpans(text,'saved_offset location');assert(spans.length<=8);
 assert(spans.some(s=>s.text.includes('`saved_offset`')));for(const s of spans)assert.equal(text.slice(s.start,s.end),s.text);
});
test('definition topics preserve literal owners and factual fields at high cosine',async t=>{
 const{p,retrieval}=setup(t,'Emitted messages wait until a caller asks for them.',async(q,texts)=>texts.map(()=>.99));
 assert.equal((await retrieval.search(p.id,'What is Elara distribution?')).status,'no_results');
 assert.equal((await retrieval.search(p.id,'What is the capacity of Elara?')).status,'no_results');
});
test('lexical mode never makes semantic definition or window proofs',async t=>{
 let calls=0;const{p,retrieval}=setup(t,'Emitted messages wait until a caller asks for them.',async(q,texts)=>{calls++;return texts.map(()=>.99);});
 assert.equal((await retrieval.search(p.id,'What is deferred distribution?',{mode:'lexical'})).status,'no_results');assert.equal(calls,0);
});

test('the strongest supported window wins over an earlier incidental match',async t=>{
 const early='The reference lists local folders used to upload documentation.';
 const fact='Refresh the local documentation folder hourly while the controller runs.';
 const content=early+'\n\n'+filler+'\n\n'+fact;
 const{p,retrieval}=setup(t,content,async(q,texts)=>texts.map(s=>s.length<500&&s.includes('hourly')?.85:s.includes('local folders')?.3:.01));
 const r=await retrieval.search(p.id,'How do I refresh local documentation?');
 assert.equal(r.status,'ok');assert(r.hits[0].content.includes(fact));
 assert.equal(content.slice(r.hits[0].excerptOffset,r.hits[0].excerptOffset+r.hits[0].content.length),r.hits[0].content);
 assert(r.serializedBytes<=p.budget*3);
});

test('focused evidence keeps nearby operational instructions within the original context bound',()=>{
 const fact='Refresh local references hourly.';
 const text=fact+' The controller must be running. Uploaded snapshots do not refresh. '+
  'Source policies are checked before publication. Use Refresh / retry for an immediate update. '+filler;
 const span=support.returnedSpanContext(text,0,fact.length);
 assert(span.text.includes('Use Refresh / retry'));
 assert(span.text.length<=1600);
 assert.equal(text.slice(span.start,span.end),span.text);
});
