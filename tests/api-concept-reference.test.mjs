import test from 'node:test';import assert from 'node:assert/strict';import {requestPlan,passageSupportsRequest} from '../dist/support.js';
test('ordinary lowercase API concept names stay semantic while explicit names and domains remain literal',()=>{
 const query='How does Example.getSystemErrorName() differ from producing and formatting errorname text?',plan=requestPlan(query);assert(!plan.subjects.includes('errorname'));assert.equal(plan.semanticContexts[plan.semanticSubjects[0]],'producing and formatting error name text');
 const body='The name corresponding to the numeric error code is returned as a string.';assert(passageSupportsRequest(query,body,[],plan.semanticSubjects,['Example.getSystemErrorName','Example']));
 for(const reference of ['biometricname','Errorname','`errorname`']){const q='How does Example.getSystemErrorName() differ from producing and formatting '+reference+' text?',p=requestPlan(q);assert(p.subjects.some(s=>s.includes(reference)),reference);assert(!passageSupportsRequest(q,body,[],p.semanticSubjects,['Example.getSystemErrorName','Example']),reference);}
 assert(!passageSupportsRequest(query,body,[],[],['Example.getSystemErrorName','Example']),'the whole activity still requires semantic proof');
});
