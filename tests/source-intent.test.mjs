import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {selectSources} from '../dist/retrieval.js';
import {Service} from '../dist/service.js';
import {DEFAULT_METADATA} from '../dist/state.js';

function setup(t){
 const f=fixture(t),p=addProject(f.store,f.code,'Copper Atlas');p.maxSources=1;
 const guide=addSource(f.store,p,{id:'a-guide',name:'Copper Atlas documentation',metadata:{...DEFAULT_METADATA,kind:'guide'}});
 const code=addSource(f.store,p,{id:'z-code',name:'Copper Atlas source code',tags:['implementation','typescript'],metadata:{...DEFAULT_METADATA,kind:'project_context'}});
 return {...f,p,guide,code};
}
test('implementation intent beats an arbitrary source ID tie',t=>{
 const {p,guide,code}=setup(t);
 for(const q of ['How does our implementation skip unchanged files?','Where is the project refresh function defined?','Which events does registerWidget configure?']){
  const selected=selectSources([guide,code],q,p)[0];assert.equal(selected.collection.id,code.id,q);assert.match(selected.reason,/implementation/i);
 }
});
test('ordinary application usage routes to its guide',t=>{
 const {p,guide,code}=setup(t);
 for(const q of ['How do I refresh a local folder?','How can we enable scheduled refresh?','How should I install Copper Atlas?'])assert.equal(selectSources([code,guide],q,p)[0].collection.id,guide.id,q);
});
test('short words cannot match arbitrary substrings in source metadata',t=>{
 const {p,store}=setup(t);const unrelated=addSource(store,p);
 unrelated.id='a-unrelated';unrelated.name='Companion resource';unrelated.tags=[];
 const exact={...unrelated,id:'z-exact',name:'Atlas reference'};
 assert.equal(selectSources([unrelated,exact],'Give me an Atlas reference for our task',p)[0].collection.id,exact.id);
});
test('explicit source choices retain precedence over intent',t=>{
 const {p,guide,code}=setup(t);assert.equal(selectSources([guide,code],'Which events does registerWidget configure?',p,[guide.id])[0].collection.id,guide.id);
});
test('named external library keeps its reference ahead of unrelated project implementation',t=>{
 const {p,code,store}=setup(t);const api=addSource(store,p,{id:'y-api',name:'Birch SDK reference',metadata:{...DEFAULT_METADATA,kind:'api',library:'Birch'}});
 assert.equal(selectSources([code,api],'Where is the Birch upload function defined?',p)[0].collection.id,api.id);
});
test('one-source hook uses task intent for both code and usage without changing explicit search breadth',async t=>{
 const {home,code:source,guide,p}=setup(t);const service=new Service(home);t.after(()=>service.close());const selected=[];
 service.grounded.search=async c=>{selected.push(c.id);return [{url:'https://example.com/'+c.id,content:c.id===source.id?'registerWidget configures SessionOpen and TaskSend.':'Open Settings and enable scheduled refresh.',score:1}];};
 const hook=prompt=>service.hook(p.id,{hook_event_name:'UserPromptSubmit',session_id:'intent-check',cwd:p.root,prompt});
 assert((await hook('Which events does registerWidget configure?')).hookSpecificOutput);
 assert((await hook('How do I enable scheduled refresh?')).hookSpecificOutput);
 assert.deepEqual(selected,[source.id,guide.id]);
});

test('project code symbols use keyword candidates while guide prose retains semantic candidates',async t=>{
 const {home,code:source,guide,p}=setup(t),service=new Service(home);t.after(()=>service.close());const modes=[];
 service.grounded.search=async(c,q,limit,signal,keyword)=>{modes.push([c.id,keyword]);return [{url:'https://example.com/'+c.id,content:c.id===source.id?'registerWidget configures SessionOpen and TaskSend.':'Open Settings and enable scheduled refresh.',score:1}];};
 await service.hook(p.id,{hook_event_name:'UserPromptSubmit',session_id:'code-keyword',cwd:p.root,prompt:'Which events does registerWidget configure?'});
 await service.hook(p.id,{hook_event_name:'UserPromptSubmit',session_id:'guide-semantic',cwd:p.root,prompt:'How do I enable scheduled refresh?'});
 assert.deepEqual(modes,[[source.id,true],[guide.id,false]]);
});
