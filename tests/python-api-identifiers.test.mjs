import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {declaredApiContext} from '../dist/api-context.js';import {missingIdentifiers,requiredIdentifiers,conditionSupportsRequest} from '../dist/support.js';import {Retrieval} from '../dist/retrieval.js';import {fixture,addProject,addSource} from './helpers.mjs';
const load=key=>fs.readFileSync(new URL('../evidence/windows-python-identifiers-repair/primary/'+key+'/'+key+'.rst',import.meta.url),'utf8');
const paragraph=(source,heading)=>source.slice(source.indexOf(heading)+heading.length).trimStart().split(/\n\s*\n/)[0].trimEnd();
test('ordinary Python module declarations bind a standalone function to its namespace',()=>{
 const source=load('heapq'),body='Transform list *x* into a heap, in-place, in linear time.';
 const context=declaredApiContext(source,body);assert(context?.identifiers.includes('heapq.heapify'));
 assert.deepEqual(missingIdentifiers('What does heapq.heapify do?',[body],[context.identifiers]),[]);
 assert(missingIdentifiers('What does other_heap.heapify do?',[body],[context.identifiers]).length);
 for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
});
test('a module scope switch never borrows the previous owner or namespace',()=>{
 const source='.. module:: first\n\n.. class:: Owner\n\n   .. method:: action()\n\n      The first object updates its own retained state.\n\n.. module:: second\n\n.. function:: action()\n\n   The second function transforms a sequence into ordered data.';
 const context=declaredApiContext(source,'The second function transforms a sequence into ordered data.');
 assert(context?.identifiers.includes('second.action'));assert(!context.identifiers.some(id=>id.startsWith('first')));assert(!context.identifiers.includes('second.Owner.action'));
});
test('compatibility metadata cannot manufacture an absent module declaration',()=>{
 const source='.. function:: heapify(data)\n\n   Transform the supplied sequence into a heap in linear time.';
 const context=declaredApiContext(source,'Transform the supplied sequence into a heap in linear time.');
 assert(context);assert(missingIdentifiers('heapq.heapify',['Transform the supplied sequence into a heap in linear time.'],[context.identifiers]).length);
});
test('a declaration-only chunk quotes bounded adjacent source text from that API only',()=>{
 const source=load('heapq'),context=declaredApiContext(source,'.. function:: heapify(x)\n\n');
 assert(context?.sourceExcerpt);const quote=source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end);
 assert(quote.includes('linear time'));assert(!quote.includes('heapreplace'));assert(quote.length<=1600);
 for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
});
test('a duplicate declaration across API owners cannot expand a neighbouring body',()=>{
 assert.equal(declaredApiContext(load('io'),'   .. method:: readinto(b, /)\n\n'),undefined);
 for(const owner of ['RawIOBase','BufferedIOBase']){
  const source=load('io'),context=declaredApiContext(source,'   .. method:: readinto(b, /)\n\n',['io.'+owner+'.readinto']);
  assert(context?.identifiers.includes('io.'+owner+'.readinto'));assert(context.sourceExcerpt);
  assert(source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end).includes('number of bytes read'));
 }
 assert.equal(declaredApiContext(load('io'),'   .. method:: readinto(b, /)\n\n',['io.IOBase.readinto']),undefined);
 assert.equal(declaredApiContext(load('io'),'   .. method:: readinto(b, /)\n\n',['other_io.RawIOBase.readinto']),undefined);
});
test('a complete unique paragraph is not made ambiguous by a shared sentence or line',()=>{
 const source=load('heapq');
 for(const member of ['heappop','heapreplace']){
  const body=paragraph(source,'.. function:: '+member+'(' + (member==='heappop'?'heap)':'heap, item)'));
  const context=declaredApiContext(source,body);assert(context?.identifiers.includes('heapq.'+member));
  assert(!context.identifiers.includes('heapq.'+(member==='heappop'?'heapreplace':'heappop')));
  for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
 }
});
test('a genuinely shared fragment still cannot choose an API owner',()=>{
 assert.equal(declaredApiContext(load('heapq'),'If the heap is empty, :exc:`IndexError` is raised.'),undefined);
});
test('mixed API paragraphs cannot lend each other an identity',()=>{
 const source=load('heapq'),first=paragraph(source,'.. function:: heappop(heap)'),second=paragraph(source,'.. function:: heapreplace(heap, item)');
 assert.equal(declaredApiContext(source,first+'\n\n'+second),undefined);
});
test('member fallback and its cache retain the original namespace and owner request',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);const source=load('io'),calls=[];
 const retrieval=new Retrieval(f.store,{search:async(c,q,limit,signal,lexical,request)=>{
  calls.push({q,request});if(q!=='readinto')return [];
  const context=declaredApiContext(source,'   .. method:: readinto(b, /)\n\n',requiredIdentifiers(request));if(!context?.sourceExcerpt)return [];
  return [{url:'https://example.com/io',content:source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end),apiContext:context,score:1}];
 }});
 const raw='What does io.RawIOBase.readinto return?',buffered='What does io.BufferedIOBase.readinto return?';
 for(const query of [raw,buffered,raw]){
  const result=await retrieval.search(p.id,query);assert.equal(result.status,'ok');
  assert(result.hits.every(h=>h.apiContext.identifiers.includes(requiredIdentifiers(query)[0])));
 }
 assert.equal(calls.filter(c=>c.q==='readinto').length,2);assert(calls.filter(c=>c.q==='readinto').every(c=>[raw,buffered].includes(c.request)));
 assert.equal((await retrieval.search(p.id,'What does other_io.RawIOBase.readinto return?')).status,'no_results');
});
test('declared class/member shorthand retains its fully qualified proof',()=>{
 const source=load('array'),body=paragraph(source,'   .. method:: tounicode()');
 const context=declaredApiContext(source,body);assert(context?.identifiers.includes('array.array.tounicode'));assert(context.identifiers.includes('array.tounicode'));
 for(const query of ['array.tounicode','array.array.tounicode'])assert.deepEqual(missingIdentifiers(query,[body],[context.identifiers]),[]);
 assert(missingIdentifiers('other_array.array.tounicode',[body],[context.identifiers]).length);
 assert(missingIdentifiers('array.imaginary',[body],[context.identifiers]).length);
});
test('an API section ends before dedented prose outside that class',()=>{
 const source=load('array'),context=declaredApiContext(source,'   .. method:: tounicode()\n\n');assert(context?.sourceExcerpt);
 assert(!source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end).includes('The string representation'));
 const outside='The string representation of array objects has the form\n``array(typecode, initializer)``.';
 assert.equal(declaredApiContext(source,outside),undefined);
});
test('empty occupancy paraphrases keep their complete predicate and same API evidence',()=>{
 const source=load('heapq'),body=paragraph(source,'.. function:: heappop(heap)');
 assert(conditionSupportsRequest('What exception does heapq.heappop raise when there are no items?',body));
 assert(conditionSupportsRequest('What exception does heapq.heappop raise when it is empty?',body));
 assert(conditionSupportsRequest('What does Example.take return when empty?','If no entries are present, it returns None.'));
 assert(!conditionSupportsRequest('What does Example.take return when empty?','No entries are encrypted. It returns None.'));
 assert(!conditionSupportsRequest('What does Example.take return when there are no items?','The buffer is never empty.'));
 for(const condition of ['no network packets are present','there are no encrypted items','there are no items on Mars'])assert(!conditionSupportsRequest('What exception does heapq.heappop raise when '+condition+'?',body),condition);
});
