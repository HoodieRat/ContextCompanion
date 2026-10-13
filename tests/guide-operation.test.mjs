import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {DEFAULT_METADATA} from '../dist/state.js';
import {Retrieval,selectSources} from '../dist/retrieval.js';
import {passageSupportsRequest} from '../dist/support.js';
import {SUPPORT_PROFILE} from '../dist/evidence-support.js';

test('factual application questions prefer guides; explicit implementation and libraries retain precedence',t=>{
 const f=fixture(t),p=addProject(f.store,f.code);p.maxSources=1;
 const code=addSource(f.store,p,{id:'a-code',name:'Project source code',metadata:{...DEFAULT_METADATA,kind:'project_context'}});
 const guide=addSource(f.store,p,{id:'z-guide',name:'Handbook',metadata:{...DEFAULT_METADATA,kind:'guide'}});
 for(const q of ['What happens to a saved configuration after its schema changes?','When does the application collect new files?','Does an upload replace the original snapshot?'])assert.equal(selectSources([code,guide],q,p)[0].collection.id,guide.id,q);
 assert.equal(selectSources([guide,code],'Where is the implementation defined?',p)[0].collection.id,code.id);
 assert.equal(selectSources([guide,code],'What happens to a saved configuration?',p,[code.id])[0].collection.id,code.id);
 const api=addSource(f.store,p,{id:'y-api',name:'Mira reference',metadata:{...DEFAULT_METADATA,kind:'api',library:'Mira'}});
 assert.equal(selectSources([guide,code,api],'What happens to the Mira client after disconnection?',p)[0].collection.id,api.id);
});

test('factual guide excerpts outrank implementation history without changing quoted bytes',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);
 const code=addSource(f.store,p,{id:'a-code',name:'Source code',metadata:{...DEFAULT_METADATA,kind:'project_context'}});
 const guide=addSource(f.store,p,{id:'z-guide',name:'Handbook',metadata:{...DEFAULT_METADATA,kind:'guide'}});
 const quotation='Saved configurations become incompatible when their schema changes. Migration preserves the original saved configuration.';
 const r=new Retrieval(f.store,{search:async c=>c.id===code.id?Array.from({length:6},(_,i)=>({url:'https://example.com/history/'+i,content:'Configuration schema changes were investigated in implementation run '+i+'. The original configuration schema changes remain recorded.',score:1})):[{url:'https://example.com/handbook',content:quotation,score:1}]});
 const result=await r.search(p.id,'What happens to saved configurations when their schema changes?');
 assert.equal(result.status,'ok');assert.equal(result.hits[0].collectionId,guide.id);assert.equal(result.hits[0].content,quotation);
});

test('causative instructions retain the requested operation and target in one affirmative sentence',()=>{
 const query='How do I make a catalog automatically encrypt exported archives?';
 for(const text of ['The catalog exports archives. It does not encrypt exported archives.','The catalog contains an encryption reference. Exported archives are visible.','The catalog automatically encrypts account passwords. It exports archives.'])assert.equal(passageSupportsRequest(query,text),false,text);
 assert(passageSupportsRequest(query,'The catalog automatically encrypts exported archives using its configured key.'));
 assert(passageSupportsRequest('Does the catalog encrypt exported archives?','The catalog does not encrypt exported archives.'));
 assert(passageSupportsRequest('How do I add a source?','Add a source in Settings.'));
 assert(passageSupportsRequest('Which operation starts a session in Mira version 7?','# Version 7\nMira 7.0 provides a session entry point.'));
});

test('a requested continuing service requires its operation and state, not a denial or generic process',()=>{
 const query='Which background agent uploads reports while the dashboard is closed?';
 for(const text of ['The background agent uploads reports while the dashboard is open.','The dashboard is closed. Reports are uploaded by the foreground command.','No background agent uploads reports while the dashboard is closed.'])assert.equal(passageSupportsRequest(query,text),false,text);
 assert(passageSupportsRequest(query,'The background agent uploads reports while the dashboard is closed.'));
 assert(passageSupportsRequest('Why does the agent not upload reports while the dashboard is closed?','The agent does not upload reports while the dashboard is closed.'));
});

test('high similarity cannot lend an unsupported goal or state to a guide result',async t=>{
 const f=fixture(t),p=addProject(f.store,f.code);
 addSource(f.store,p,{metadata:{...DEFAULT_METADATA,kind:'guide'}});
 f.store.update(s=>{s.settings.embedding={kind:'local',...SUPPORT_PROFILE};s.collections[0].active.profile=s.settings.embedding;});
 let text='The catalog exports archives. It does not encrypt exported archives.';
 const r=new Retrieval(f.store,{search:async()=>[{url:'https://example.com/guide',content:text,score:1}],similarities:async(q,texts)=>texts.map(()=>.99)});
 assert.equal((await r.search(p.id,'How do I make a catalog automatically encrypt exported archives?')).status,'no_results');
 text='The background agent uploads reports while the dashboard is open.';
 assert.equal((await r.search(p.id,'Which background agent uploads reports while the dashboard is closed?')).status,'no_results');
});
