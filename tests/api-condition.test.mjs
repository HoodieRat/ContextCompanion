import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {conditionSupportsRequest,requestPlan,runtimeQualifier} from '../dist/support.js';import {Retrieval} from '../dist/retrieval.js';import {fixture,addProject,addSource} from './helpers.mjs';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
const raw=fs.readFileSync(new URL('../evidence/windows-independent-retrieval-repair/primary/path/path.md',import.meta.url),'utf8');
const excerpt=raw.slice(raw.indexOf('## `path.extname(path)`'),raw.indexOf('## `path.format(pathObject)`'));
test('existential conditions are separate from literal API owners',()=>{
 const query='What does path.extname return when there is no dot?';assert(!requestPlan(query).subjects.includes('dot'));assert(conditionSupportsRequest(query,excerpt));
 assert(!conditionSupportsRequest('What does path.extname return when a network packet is dropped?',excerpt));
 assert(!conditionSupportsRequest(query,'path.extname returns a dot in the suffix.'));
});
test('a leading runtime scopes eligible library evidence without inventing an API',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.collections[0].metadata.library='node';s.collections[0].metadata.ecosystem='generic';s.collections[0].version='24.21.0';p.profile.dependencies=[{name:'node',ecosystem:'generic',resolved:'24.21.0',constraint:'24.21.0',confidence:'manual',workspace:''}];s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/path',content:excerpt,score:1}],similarities:async(q,texts)=>texts.map(()=>.99)});
 assert.equal((await r.search(p.id,'In Node.js, what does path.extname return when there is no dot?')).status,'ok');
 for(const query of ['In Other.js, what does path.extname return?','In Node.js, what does path.imaginary return?','In Node.js, what does path.extname return when a network packet is dropped?'])assert.equal((await r.search(p.id,query)).status,'no_results',query);
 assert.equal((await r.search(p.id,'In Node.js, what does path.extname return?',{filters:{version:'99.0.0'}})).status,'no_results');
 assert.equal((await r.search(p.id,'In Node.js, print the actual API key.')).status,'no_results');
});
test('runtime qualification requires the explicit prefix and preserves the task',()=>{
 assert.deepEqual(runtimeQualifier('In Node.js, what does path.extname return?'),{library:'node',task:'what does path.extname return?'});
 assert.equal(runtimeQualifier('Explain Node.js.imaginary.'),undefined);
});
