import test from 'node:test';import assert from 'node:assert/strict';import {operationSupportsRequest,requestPlan,passageSupportsRequest} from '../dist/support.js';
test('bounded action support matches doubled-consonant inflections without dropping operation goals',()=>{
 for(const [activity,verb] of [['running','run'],['stopping','stop'],['wrapping','wrap'],['stripping','strip'],['calling','call']])assert(operationSupportsRequest('How does Example.execute perform '+activity+' data?','Example.execute can '+verb+' the data.'),activity);
 for(const [activity,verb] of [['running','burn'],['falling','fail'],['stripping','encrypt']])assert(!operationSupportsRequest('How does Example.execute perform '+activity+' data?','Example.execute can '+verb+' the data.'),activity);
 assert(!operationSupportsRequest('How does Example.execute perform wrapping biometric coordinates?','Example.execute can wrap data.'));
});
test('API support activities bind literal goals without inventing a compound entity',()=>{
 const query='How does Example.strip support stripping ANSI codes?',body='Example.strip removes ANSI escape codes.';
 assert(!requestPlan(query).subjects.includes('ANSI codes'));assert(passageSupportsRequest(query,body));
 assert(!passageSupportsRequest('How does Example.strip support stripping biometric codes?',body));
 assert(!passageSupportsRequest('How does Example.strip support stripping ANSI codes and wrapping archives?',body));
});
