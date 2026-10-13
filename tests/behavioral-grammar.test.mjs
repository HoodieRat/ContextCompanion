import test from 'node:test';import assert from 'node:assert/strict';
import {passageSupportsRequest,missingIdentifiers,requestPlan} from '../dist/support.js';
test('behavior descriptions use semantic comparison while actual owners and code identities remain strict',()=>{
 const text='Alder lends idle channels from a pool. Concurrent consumers work independently; pending work may be cancelled.';
 for(const query of ['Describe buffering.','Explain concurrency.','What is blocking?','Describe order and waiting.','What is the purpose of pooling reusable channels?','How do I avoid constructing a new connection for every request?'])assert.equal(passageSupportsRequest(query,text),true,query);
 for(const query of ['Describe Fennel buffering.','What is Fennel used for?','What is the capacity of Alder?','Explain buffering of lunar oceans.','How many planets can the stream deliver?'])assert.equal(passageSupportsRequest(query,text),false,query);
 assert.deepEqual(missingIdentifiers('Explain UnlistedBuffer batching.',[text]),['UnlistedBuffer']);
 assert.deepEqual(requestPlan('How do I avoid constructing a new connection for every request?').subjects,[]);
 assert.equal(passageSupportsRequest('Which mechanism is used for grouping values before delivery?',text),true);
 assert.equal(passageSupportsRequest('Which mechanism is used for grouping lunar oceans before delivery?',text),false);
});
test('agenda grammar binds only complete contextual agenda questions to actual handoff directives',()=>{
 const text='Handoff D-541 says to complete the migration, run verification, then unblock the release task.';
 for(const query of ['What should we do next?','What are the next steps?','What remains to be done?','What is the plan for the next session?','Summarize the current objective and next steps.']){assert(requestPlan(query).attributes.some(a=>a.name==='plan'),query);assert.equal(passageSupportsRequest(query,text),true,query);assert.equal(passageSupportsRequest(query,'An introduction mentions a handoff but contains no plan.'),false,query);}
 for(const query of ['What should we do next to change gravity?','What are the next steps for perpetual motion?','What is the next session launch date on Venus?','What remains to be done for Fennel?'])assert(!requestPlan(query).attributes.some(a=>a.name==='plan'),query);
});
