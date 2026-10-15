import test from 'node:test';import assert from 'node:assert/strict';import {declaredApiContext} from '../dist/api-context.js';import {Retrieval} from '../dist/retrieval.js';import {fixture,addProject,addSource} from './helpers.mjs';import {SUPPORT_PROFILE} from '../dist/evidence-support.js';
const definition='The helper transfers callback results into promises without changing the supplied function.';
const condition='If a custom adapter is installed, the helper returns that adapter instead of its default behavior.';
const source='## `example.convert(original)`\n\n<!-- YAML\nadded: v1.0.0\n-->\n\n* `original` {Function}\n\n'+definition+'\n\n'+condition+'\n\n'+('Additional details describe adapter options. '.repeat(70))+'\n';
test('a Markdown declaration quotes a bounded actual definition, including long sections',()=>{
 const context=declaredApiContext(source,'## `example.convert(original)`',['example.convert']);assert(context.sourceExcerpt);assert(context.overview);const quote=source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end);assert(quote.includes(definition));assert(quote.length<=1600);for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
});
test('a verified API definition is distinct from a conditional passage without widening large bodies',()=>{
 const first=declaredApiContext(source,definition,['example.convert']),later=declaredApiContext(source,condition,['example.convert']);assert(first.overview);assert.equal(later.overview,false);assert.equal(first.sourceExcerpt,undefined);assert.equal(later.sourceExcerpt,undefined);assert.equal(declaredApiContext(source,definition,['example.other']).overview,undefined);
});
test('overview lookup continues past a conditional exact match and ranks only supported definitions',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;s.collections[0].metadata.kind='api';});const calls=[];
 const r=new Retrieval(f.store,{search:async(c,q)=>{calls.push(q);const original=q==='convert',content=original?'example.convert '+definition:'example.convert '+condition;return[{url:original?'https://example.com/definition':'https://example.com/custom',content,apiContext:{identifiers:['example.convert','example'],declarations:[],overview:original},score:1}];},similarities:async(q,texts)=>texts.map(()=>.99)});
 const result=await r.search(p.id,'How does example.convert() differ from calling functions with callbacks?',{filters:{version:'1.0.0'}});assert.equal(result.status,'ok');assert(calls.includes('convert'));assert(result.hits[0].content.includes(definition));
 assert.equal((await r.search(p.id,'How does example.convert() differ from teleporting medical coordinates?',{filters:{version:'1.0.0'}})).status,'no_results');
});
