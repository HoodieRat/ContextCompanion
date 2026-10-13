import test from 'node:test';import assert from 'node:assert/strict';
import{fixture,addProject,addSource}from'./helpers.mjs';import{Retrieval}from'../dist/retrieval.js';import{SUPPORT_PROFILE}from'../dist/evidence-support.js';
function setup(t,content){const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={...s.settings.embedding,...SUPPORT_PROFILE,kind:'local'};s.collections[0].active.profile=s.settings.embedding;});return{p,retrieval:new Retrieval(f.store,{search:async()=>[{url:'https://example.com/independent-behavior',content,score:1}],similarities:async(q,passages)=>passages.map(()=>.99)})};}
for(const[name,content,positive,negative]of [
 ['passive context','The dispatcher partitions incoming requests before delivery.','How can a stream of requests be divided and dispatched individually?','How can a stream of Vega requests be divided and dispatched individually?'],
 ['bound descriptive context','A validated output is retained until a replacement succeeds.','How is a previous successful artifact protected if replacement fails?','How is a previous Vega artifact protected if replacement fails?'],
 ['modified live role','Periodic renewal distinguishes abandoned workers from processors that remain alive.','How do I tell an abandoned worker from a still-live processor?','How do I tell an abandoned worker from a Vega processor?'],
 ['abstract purpose','The project objective is organizing recordings.','What is the desired outcome of the application?','What is the desired outcome of Vega?'],
 ['adverb and behavior object','The interface cannot directly write to index storage.','What boundary prevents the interface from directly modifying index storage?','What boundary prevents the interface from directly modifying magnetic fields?'],
 ['complete combined handoff','Handoff B-492 says to complete migration. The last verified result is schema import.','Which verified result and next steps should continue into a fresh session?','Which verified result and next steps for biological repair should continue into a fresh session?']
])test(name+' preserves contextual paraphrase and unsupported-owner refusal at high cosine',async t=>{const{p,retrieval}=setup(t,content);assert.equal((await retrieval.search(p.id,positive)).status,'ok');assert.equal((await retrieval.search(p.id,negative)).status,'no_results');});

test('generic operational diagnostics cannot answer an explicit project-purpose question',async t=>{
 const{p,retrieval}=setup(t,'The diagnostic report measures request count, elapsed time and first result.');
 assert.equal((await retrieval.search(p.id,'What is the desired outcome of the application?')).status,'no_results');
});
