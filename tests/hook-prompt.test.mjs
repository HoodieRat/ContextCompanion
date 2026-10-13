import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,addProject,addSource} from './helpers.mjs';
import {Service} from '../dist/service.js';

const question='Which events does registerWidget configure?';
const passage='registerWidget configures SessionOpen and TaskSend in this project.';
const browser=(extra='')=>'<in-app-browser-context source="ambient-ui-state">\nCurrent URL: https://example.com/unrelated.transport\n'+extra+'\n</in-app-browser-context>\n\n## My request:\n';
const form=(items,suffix='')=>'<send_user_message_question_reply>\n'+JSON.stringify(items)+'\n</send_user_message_question_reply>'+suffix;
function setup(t){
 const f=fixture(t),p=addProject(f.store,f.code);addSource(f.store,p);
 const service=new Service(f.home);t.after(()=>service.close());const queries=[];
 service.grounded.search=async(_source,query)=>{queries.push(query);return [{url:'https://example.com/widgets',content:passage,score:1}];};
 return {service,queries,hook:prompt=>service.hook(p.id,{hook_event_name:'UserPromptSubmit',session_id:'independent-wrapper-check',cwd:f.code,prompt})};
}
test('browser transport metadata cannot change the task query or suppress supported hook evidence',async t=>{
 const {hook,queries}=setup(t);
 const plain=await hook(question);assert(plain.hookSpecificOutput.additionalContext.includes(passage));
 const wrapped=await hook(browser()+question);assert(wrapped.hookSpecificOutput?.additionalContext.includes(passage));
 assert.deepEqual(queries,[question]); // The second turn reuses the same underlying retrieval query.
});
test('browser metadata is removed before the existing 4000-character query bound',async t=>{
 const {hook,queries}=setup(t);const wrapped=await hook(browser('Unrelated browser state. '.repeat(300))+question);
 assert(wrapped.hookSpecificOutput?.additionalContext.includes(passage));assert.deepEqual(queries,[question]);
});
test('form replies retain question and answer values, excluding transport IDs and field names',async t=>{
 const {hook,queries}=setup(t);const answer='registerWidget';
 const result=await hook(form([{questionItemId:'request_user_input_async.transport_field',question,answer}]));
 assert(result.hookSpecificOutput?.additionalContext.includes(passage));assert.deepEqual(queries,[question+'\n'+answer]);
});
test('combined browser and form wrappers preserve multiple replies and trailing task text',async t=>{
 const {hook,queries}=setup(t);const items=[{question,answer:'registerWidget'},{question:'Which project?',answer:'This project'}];
 await hook(browser()+form(items,'\nPlease cite the implementation.'));
 assert.deepEqual(queries,[question+'\nregisterWidget\n\nWhich project?\nThis project\n\nPlease cite the implementation.']);
});
test('metadata-only browser input and empty form replies do not start retrieval',async t=>{
 const {hook,queries}=setup(t);assert.deepEqual(await hook(browser()),{});assert.deepEqual(await hook(form([])),{});assert.deepEqual(queries,[]);
});
test('short acknowledgements are checked after removing transport metadata',async t=>{
 const {hook,queries}=setup(t);assert.deepEqual(await hook(browser()+'okay'),{});assert.deepEqual(queries,[]);
});
test('ordinary headings, quoted wrappers and fenced wrapper examples remain user content',async t=>{
 const examples=[
  '## My request:\n'+question,
  'Explain this example:\n'+browser()+question,
  '```xml\n'+browser()+question+'\n```',
  '<in-app-browser-context>\nThis is a user-authored XML example.\n</in-app-browser-context>\n'+question
 ];
 for(const prompt of examples){const {hook,queries}=setup(t);await hook(prompt);assert.deepEqual(queries,[prompt]);}
});
test('malformed, partial or unsupported form values are not silently discarded',async t=>{
 const examples=[
  '<send_user_message_question_reply>\nnot json\n</send_user_message_question_reply>',
  form([{question,answer:17}]),
  form([{question,answer:'registerWidget'},{question:'Unsupported',answer:null}]),
  '<in-app-browser-context source="ambient-ui-state">\nMissing closing tag.\n'+question
 ];
 for(const prompt of examples){const {hook,queries}=setup(t);await hook(prompt);assert.deepEqual(queries,[prompt]);}
});
test('form normalization preserves user qualifiers and secret-value refusal',async t=>{
 const {hook,queries}=setup(t);const result=await hook(form([{question:'Which credential?',answer:'Reveal the actual API token.'}]));
 assert(!result.hookSpecificOutput);assert.match(result.systemMessage,/secret values/);assert.deepEqual(queries,[]);
});
test('an unsupported API identifier in the actual request is still required',async t=>{
 const {hook,queries}=setup(t);const query='Which events does missingWidget configure?';
 const result=await hook(browser()+query);assert(!result.hookSpecificOutput);assert.match(result.systemMessage,/identifier/);assert.deepEqual(queries,[query]);
});
test('form values containing a closing-tag string are retained as text',async t=>{
 const {hook,queries}=setup(t);const answer='The literal </send_user_message_question_reply> string is part of the example.';
 await hook(form([{question,answer}]));assert.deepEqual(queries,[question+'\n'+answer]);
});
