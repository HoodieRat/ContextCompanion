import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';
import {declaredCodeContext} from '../dist/code-context.js';
// An independent parser supplies the same declaration/offset interface; live
// receipts separately exercise Grounded's installed Tree-sitter parser.
function tree(source){
 const file=ts.createSourceFile('independent.ts',source,ts.ScriptTarget.Latest,true);
 const wrap=node=>({type:ts.isClassDeclaration(node)?'class_declaration':ts.isMethodDeclaration(node)?'method_definition':'other',startIndex:node.getStart(file),endIndex:node.end,hasError:file.parseDiagnostics.length>0,
  get namedChildren(){return node.getChildren(file).map(wrap);},
  childForFieldName(field){if(field==='name')return node.name?wrap(node.name):null;if(field==='body'&&ts.isClassDeclaration(node))return {type:'class_body',startIndex:source.indexOf('{',node.name.end),endIndex:node.end,hasError:false,namedChildren:node.members.map(wrap),childForFieldName:()=>null};return field==='body'&&node.body?wrap(node.body):null;}
 });return wrap(file);
}
const quote="const rotationMarker = 'JADE_REVISION_T84';";
const source=`// class Imaginary { rotate() { fake(); } }
export class WideLedger {
 async inspect() { return 'OTHER_INSPECTION_VALUE'; }
 async rotate() { ${quote} return rotationMarker; }
}
export class ForeignLedger { async rotate() { return 'FOREIGN_MARKER_ONLY'; } }
`;
test('quoted member binds to a proved class with exact immutable offsets',()=>{
 const context=declaredCodeContext(source,quote,tree(source),['WideLedger.rotate']);assert.deepEqual(context.identifiers,['WideLedger.rotate']);
 for(const d of context.declarations)assert.equal(source.slice(d.start,d.end),d.text);
 assert(source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end).includes(quote));
});
test('wrong owners, missing methods, comments and unquoted text cannot supply API identity',()=>{
 for(const id of ['ForeignLedger.rotate','Imaginary.rotate','WideLedger.imaginary'])assert.equal(declaredCodeContext(source,quote,tree(source),[id]),undefined,id);
 assert.equal(declaredCodeContext(source,'The requested method queues an undocumented build.',tree(source),['WideLedger.rotate']),undefined);
});
test('multi-method returned chunks quote only the requested corroborated member',()=>{
 const passage=source.slice(source.indexOf(' async inspect'),source.indexOf('\n}\n'));
 const context=declaredCodeContext(source,passage,tree(source),['WideLedger.rotate']);assert(context);const excerpt=source.slice(context.sourceExcerpt.start,context.sourceExcerpt.end);
 assert(excerpt.includes(quote));assert(!excerpt.includes('OTHER_INSPECTION_VALUE'));
});
test('duplicate declarations and malformed syntax fail closed',()=>{
 const duplicate=source+source;assert.equal(declaredCodeContext(duplicate,quote,tree(duplicate),['WideLedger.rotate']),undefined);
 const malformed=source.slice(0,source.indexOf('export class Foreign'))+'broken(';assert.equal(declaredCodeContext(malformed,quote,tree(malformed),['WideLedger.rotate']),undefined);
});
test('strings, computed members and nested classes cannot masquerade as outer members',()=>{
 const bad=`export class Outer { async inspect(){ const description = 'class Other { rotate() {} }'; class Inner { rotate(){ ${quote} } } } ['rotate'](){ ${quote} } }`;
 assert.equal(declaredCodeContext(bad,quote,tree(bad),['Outer.rotate']),undefined);
});
test('Unicode positions and repeated prose do not borrow another member',()=>{
 const text='// 🪨 Unicode offset check\n'+source;
 const context=declaredCodeContext(text,quote,tree(text),['WideLedger.rotate']);assert(context);
 for(const d of context.declarations)assert.equal(text.slice(d.start,d.end),d.text);
 assert.equal(declaredCodeContext(text,quote,tree(text),['WideLedger.inspect']),undefined);
});
