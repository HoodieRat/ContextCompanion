import test from 'node:test';import assert from 'node:assert/strict';import {passageSupportsRequest,requestPlan} from '../dist/support.js';
test('descriptive definitions and gerund objects retain semantic support without inventing an entity name',()=>{
 const body='Sorrel postpones calculation until a consumer needs it. A pool lends resources; a producer emits notifications to listeners. Eager evaluation computes immediately; lazy evaluation postpones work. Delayed delivery waits for a signal. Demand-driven processing waits for a consumer; push-oriented processing delivers emitted values.';
 for(const query of ['What is eager evaluation?','What is lazy evaluation?','What is delayed delivery?','What is demand-driven processing?','What is push-oriented delivery?','How do I use pooling idle channels without constructing new channels?','Which mechanism is used for producing delayed notifications to listeners?','Explain producing values for listeners.','What is the difference between lazy and eager evaluation?'])assert.equal(passageSupportsRequest(query,body),true,query);
 for(const query of ['What is Caldera evaluation?','What is Caldera used for?','What is Beijing used for?','What is delayed orbital teleportation?','What is demand-driven weather control?','How do I use pooling lunar oceans without constructing new channels?','Which mechanism is used for producing signals from Jupiter?'])assert.equal(passageSupportsRequest(query,body),false,query);
 assert.equal(passageSupportsRequest('What is the difference between lazy evaluation and perpetual motion?',body),false);
 assert.equal(passageSupportsRequest('Compare eager calculation and perpetual motion.',body),false);
 assert.equal(passageSupportsRequest('Compare eager and lazy calculation.',body),true);
});
test('additional complete agenda verbs cannot lend a directive to appended goals',()=>{
 const body='Handoff D-821 says to complete the migration, run verification, then unblock the delivery task.';
 for(const verb of ['pick up','carry forward','focus on','resume','prioritize','tackle','handle']){
  const query=`What should the next session ${verb}?`;assert(requestPlan(query).attributes.some(a=>a.name==='plan'),query);assert.equal(passageSupportsRequest(query,body),true,query);
  assert(!requestPlan(`What should the next session ${verb} to reverse entropy?`).attributes.some(a=>a.name==='plan'));
 }
});
