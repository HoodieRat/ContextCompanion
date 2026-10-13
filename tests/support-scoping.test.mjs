import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, addProject, addSource } from './helpers.mjs';
import { Retrieval } from '../dist/retrieval.js';
import { passageSupportsRequest, semanticSupportWindows, missingNamedSubjects, missingIdentifiers } from '../dist/support.js';

test('property corroboration requires one passage and cannot borrow unrelated fields or negated scope', async t => {
  const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
  const retrieval=new Retrieval(f.store,{search:async()=>[
    {url:'https://example.com/one',content:'Spruce controls callback ordering. This guide does not document capacity.',score:1},
    {url:'https://example.com/two',content:'Willow capacity is 64 bytes.',score:1}
  ],similarities:async()=>[.99,.99]});
  assert.equal((await retrieval.search(p.id,'What is the capacity of Spruce?')).status,'no_results');
  assert.equal((await retrieval.search(p.id,'What is the capacity of Willow?')).status,'ok');
  assert.equal((await retrieval.search(p.id,'What is the current temperature of Willow?')).status,'no_results');
});

test('ordinary capitalization, auxiliaries and adverbs do not become identifier obligations', () => {
  const text='A subscriber starts at its durable cursor after termination.';
  for(const query of ['How can a consumer remember progress?', 'How can a Consumer usually remember progress?', 'How might a consumer ordinarily remember progress?']){
    assert.deepEqual(missingNamedSubjects(query,[text]),[]);
    assert.equal(passageSupportsRequest(query,text),true);
  }
  assert.equal(passageSupportsRequest('What is the current version of CedarCache?','CedarCache has no documented version. OtherCache version is 4.'),false);
  for(const query of ['How long is a record valid?', 'How long is a record usually valid?', 'How long is a record ordinarily valid?']){
    assert.equal(passageSupportsRequest(query,'A record expires after thirty seconds.'),true);
  }
});

test('short facts and query-directed windows survive a long returned passage within the eight-window bound', () => {
  const content='A short introductory fact. '+('A lengthy administrative paragraph describes unrelated bookkeeping. '.repeat(25))+'Cursor: 42. '+('A long trailing paragraph describes unrelated bookkeeping. '.repeat(25));
  const windows=semanticSupportWindows(content,'cursor');
  assert(windows.length<=8);
  assert(windows.some(window=>window.includes('Cursor: 42.')));
  const distinct=Array.from({length:40},(_,i)=>`Administrative paragraph ${i} records unrelated bookkeeping.`).join(' ')+' Resume: 42.';
  assert(semanticSupportWindows(distinct,'remember progress').some(window=>window.includes('Resume: 42.')));
});

test('conversation instructions preserve the requested fact and strict identities', () => {
  const text='MartenReceipt provides registration code CCDEVROLE111.';
  const base='What registration code does MartenReceipt provide?';
  for(const format of ['Use only context already supplied for this turn; do not call tools or read files. Include the source.', 'Use retrieved context. Give just the answer.', 'Use only supplied evidence; include the source.', 'Return only the code.']) {
    assert.equal(passageSupportsRequest(base+' '+format,text),true,format);
    assert.deepEqual(missingIdentifiers(base.replace('MartenReceipt','UnlistedReceipt')+' '+format,[text]),['UnlistedReceipt']);
  }
  assert.equal(passageSupportsRequest(base+' Return only its current version.',text),false);
  assert.equal(passageSupportsRequest('Can unfinished work be stopped before completion?','Unfinished work can be cancelled.'),true);
  assert.equal(passageSupportsRequest('What is the date before the earthquake?','The creation date is the current calendar day.'),false);
  assert.equal(passageSupportsRequest('What is used as the current version?','The runtime version is 3.1.'),true);
});

test('transitive release actions do not request a version while release facts remain required', () => {
  const text='A worker borrows an idle connection and returns it when work finishes.';
  for(const query of ['How can a worker borrow and then release a reusable connection?', 'How does a worker release its idle connection?', 'Could a worker usually release the connection?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['What is the current release?', 'Can a worker use the current release?', 'Can a worker release the connection and report the current version?'])assert.equal(passageSupportsRequest(query,text),false,query);
  assert.equal(passageSupportsRequest('What is the current release?','The current software release is 3.1.'),true);
});

test('numeric owner qualifiers and progressive actions retain the subject and requested fields', () => {
  const text='# Version 4\nCobalt 4.0 provides a session entry point.';
  assert.equal(passageSupportsRequest('Which operation starts a session in Cobalt version 4?',text),true);
  assert.equal(passageSupportsRequest('What operation is available for Cobalt revision 4?',text),true);
  assert.equal(passageSupportsRequest('Which operation starts a session in Umber version 4?',text),false);
  assert.equal(passageSupportsRequest('What is the capacity of Cobalt version 4?',text),false);
  assert.equal(passageSupportsRequest('Which operation starts a session in Cobalt version 4?','Cobalt provides a session entry point.'),false);
  for(const query of ['What is blocking the upcoming step?','What is preventing the current task from starting?'])assert.equal(passageSupportsRequest(query,'Task DEV-REVIEW is blocked until DEV-SCAN passes verification.'),true);
  assert.equal(passageSupportsRequest('What is Umber blocking?','Task DEV-REVIEW is blocked.'),false);
});

test('simple future-session agenda requires an actual handoff directive without lending support to extra goals', async t => {
  const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
  f.store.update(s=>{s.settings.embedding.kind='local';s.collections[0].active.profile={...s.settings.embedding,kind:'local',model:'Xenova/all-MiniLM-L6-v2',revision:'751bff37182d3f1213fa05d7196b954e230abad9',dimensions:384};});
  const content='Handoff K-137 says to complete W-042, run verification, then unblock W-090.';
  const retrieval=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/handoff',content,score:1}],similarities:async()=>[.1]});
  for(const query of ['What should a following session finish?','What work should a later session continue?','What should the next session work on?'])assert.equal((await retrieval.search(p.id,query)).status,'ok',query);
  for(const query of ['What activity should a following session undertake to reverse aging?','What should a later session do to control the weather?'])assert.equal((await retrieval.search(p.id,query)).status,'no_results',query);
  assert.equal(passageSupportsRequest('What should the next session work on?','This introduction mentions a handoff. It contains no current plan.'),false);
});

test('interrogative determiners bind a noun call while verb calls keep their requested object', () => {
  const text='# Cobalt version 4\nCobalt 4.0 provides a session entry point.';
  for(const query of ['Which call creates a session in Cobalt version 4?','What call opens a session for Cobalt revision 4?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['Which call creates a session in Umber version 4?','What call opens a session for Umber revision 4?','How do I call Umber?'])assert.equal(passageSupportsRequest(query,text),false,query);
  assert.equal(passageSupportsRequest('How do I call Cobalt?',text),true);
});
