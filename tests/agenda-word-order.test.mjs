import test from 'node:test';import assert from 'node:assert/strict';import {passageSupportsRequest,requestPlan} from '../dist/support.js';
test('complete future-session agenda grammar supports word-order variants while extra goals remain ordinary requests',()=>{
 const body='Handoff G-623 says to finish conversion then run verification.';
 for(const q of ['What must the next session address first?','What should I carry into my next session?','What should the next session remember?','What should the following session pick up first?']){assert(requestPlan(q).attributes.some(a=>a.name==='plan'),q);assert.equal(passageSupportsRequest(q,body),true,q);assert.equal(passageSupportsRequest(q,'The introduction mentions a handoff but contains no plan.'),false,q);}
 for(const q of ['What must the next session address first to reverse aging?','What should I carry into my next session to change gravity?','What should the next session remember about Jupiter?','What should the following session pick up first for weather control?'])assert(!requestPlan(q).attributes.some(a=>a.name==='plan'),q);
});
