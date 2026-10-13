import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {declaredApiContext} from '../dist/api-context.js';import {missingIdentifiers,requestPlan,passageSupportsRequest} from '../dist/support.js';
const source=fs.readFileSync(new URL('../evidence/windows-independent-retrieval-repair/primary/async-sync/async-sync.rst',import.meta.url),'utf8');
const paragraph='      If the lock is *unlocked*, a :exc:`RuntimeError` is raised.';
test('approved RST declarations bind a quoted member to its namespace and owner',()=>{
 const context=declaredApiContext(source,paragraph);assert(context.identifiers.includes('asyncio.Lock.release'));
 for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
 assert.deepEqual(missingIdentifiers('What exception does asyncio.Lock release raise when unlocked?',[paragraph],[context.identifiers]),[]);
 for(const query of ['What exception does asyncio.Event release raise when unlocked?','What exception does threading.Lock release raise when unlocked?','What exception does asyncio.Lock imaginary raise when unlocked?'])assert(missingIdentifiers(query,[paragraph],[context.identifiers]).length,query);
 assert(passageSupportsRequest('What exception does asyncio.Lock release raise when unlocked?',paragraph,[],[],context.identifiers));
});
test('an inherited member reference stays bound to the documented owner',()=>{
 const paragraph='   A bounded semaphore is a version of :class:`Semaphore` that raises\n   a :exc:`ValueError` in :meth:`~Semaphore.release` if it\n   increases the internal counter above the initial *value*.';
 const context=declaredApiContext(source,paragraph);assert(context.identifiers.includes('asyncio.BoundedSemaphore.release'));
 for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
 assert(!context.identifiers.includes('threading.BoundedSemaphore.release'));
});
test('repeated prose across owners or members cannot infer an API identity',()=>{
 const shared='      The current state is reported without modifying the counter.';
 const prefix='.. currentmodule:: asyncio\n\n.. class:: Lock\n\n   .. method:: acquire()\n\n'+shared+'\n\n';
 assert.equal(declaredApiContext(prefix+'   .. method:: release()\n\n'+shared,shared),undefined);
 assert.equal(declaredApiContext(prefix+'.. class:: Event\n\n'+shared,shared),undefined);
 assert.equal(declaredApiContext(source,'An unrelated newly invented paragraph with no source occurrence.'),undefined);
 const foreign='      Consult :meth:`Event.clear` before invoking this operation.';
 const context=declaredApiContext(prefix+foreign,foreign);assert(!context.identifiers.includes('asyncio.Lock.clear'));
});
test('API spelling is separate from requested factual fields',()=>{
 assert(!requestPlan('What exception does asyncio.Lock release raise when unlocked?').attributes.some(a=>a.name==='version'));
 assert(!requestPlan('What happens if asyncio.BoundedSemaphore release exceeds the initial value?').attributes.some(a=>a.name==='version'));
 assert(requestPlan('What is the current release of Python?').attributes.some(a=>a.name==='version'));
});
test('Markdown scope recovers an unchanged path API declaration',()=>{
 const path=fs.readFileSync(new URL('../evidence/windows-independent-retrieval-repair/primary/path/path.md',import.meta.url),'utf8');
 const context=declaredApiContext(path,'The `path.join()` method joins all given `path` segments together using the\nplatform-specific separator as a delimiter, then normalizes the resulting path.');
 assert(context.identifiers.includes('path.join'));for(const d of context.declarations)assert.equal(path.slice(d.start,d.end),d.text);
});
