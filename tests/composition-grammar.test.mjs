import test from 'node:test';import assert from 'node:assert/strict';import {passageSupportsRequest,requestPlan} from '../dist/support.js';
test('comparative definitions and grammatical behavior clauses keep unknown objects and owners strict',()=>{
 const body='Functions accept other functions. Composition joins computations. A scheduler controls when work executes. Side effects execute only when requested.';
 for(const q of ['What is a higher order function?','What is switching-style composition?','What is flattening nested computations?','What is the purpose of side effects executed only when requested?','How do I avoid a record from being repeated?','How are records processed by scheduling?'])assert.equal(passageSupportsRequest(q,body),true,q);
 for(const q of ['What is higher order lunar navigation?','What is switching-style weather control?','What is flattening planetary orbits?','What is the purpose of Saturn side effects?','How does Caldera avoid a record from being repeated?'])assert.equal(passageSupportsRequest(q,body),false,q);
 assert.equal(passageSupportsRequest('How does the scheduler avoid work from running early?',body),true);
 assert.equal(passageSupportsRequest('How does the scheduler avoid work from running on Jupiter?',body),false);
});
test('complete session and project agendas do not accept appended external goals',()=>{
 const body='Handoff G-623 says to finish conversion then run verification.';
 for(const q of ['What should another session do next?','What should the next session pick up next?','What does the next session need to do?','What are the next steps for this project?','What needs to happen next?'])assert.equal(passageSupportsRequest(q,body),true,q);
 for(const q of ['What should another session do next to control the tides?','What should the next session pick up next for teleportation?','What does the next session need to do to reverse aging?','What are the next steps for an unknown spacecraft?','What needs to happen next to change gravity?'])assert(!requestPlan(q).attributes.some(a=>a.name==='plan'),q);
});
