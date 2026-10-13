import test from 'node:test';import assert from 'node:assert/strict';import {declaredApiContext} from '../dist/api-context.js';
const member='.. currentmodule:: example\n\n.. class:: Gate\n\n   .. method:: enter()\n\n      Only one waiting task proceeds into the protected section.\n\n      Waiting tasks are served in arrival order.\n\n   .. method:: exit()\n\n      Leaving the gate wakes a waiting task.\n';
test('a unique explicit member quotes its complete short section including adjacent qualifications',()=>{
 const context=declaredApiContext(member,'Only one waiting task proceeds into the protected section.',['example.Gate.enter']);assert(context.sourceExcerpt);const quote=member.slice(context.sourceExcerpt.start,context.sourceExcerpt.end);assert(quote.includes('arrival order'));assert(!quote.includes('method:: exit'));for(const d of context.declarations)assert.equal(member.slice(d.start,d.end),d.text);
});
test('generic, wrong-member, ambiguous and oversized matches do not widen a paragraph',()=>{
 for(const ids of [[],['example.Gate'],['example.Gate.exit']])assert.equal(declaredApiContext(member,'Only one waiting task proceeds into the protected section.',ids)?.sourceExcerpt,undefined);
 const ambiguous=member+'\n.. class:: Other\n\n   .. method:: enter()\n\n      Only one waiting task proceeds into the protected section.\n';assert.equal(declaredApiContext(ambiguous,'Only one waiting task proceeds into the protected section.',['example.Gate.enter']),undefined);
 const large=member.replace('Waiting tasks are served in arrival order.','Long notes. '.repeat(200));assert.equal(declaredApiContext(large,'Only one waiting task proceeds into the protected section.',['example.Gate.enter'])?.sourceExcerpt,undefined);
});
test('inherited references retain their proof without borrowing another member section',()=>{
 const source='.. currentmodule:: example\n\n.. class:: Child\n\n   Child inherits from :class:`Parent` and calls :meth:`Parent.open`.\n';const context=declaredApiContext(source,'Child inherits from :class:`Parent` and calls :meth:`Parent.open`.',['example.Child.open']);assert(context.identifiers.includes('example.Child.open'));assert.equal(context.sourceExcerpt,undefined);
});
