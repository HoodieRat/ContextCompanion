import test from 'node:test';
import assert from 'node:assert/strict';
import { passageSupportsRequest, missingIdentifiers } from '../dist/support.js';

test('unqualified code-style type names retain strict identity inside prose without classifying ordinary capitalization as code', () => {
  assert.deepEqual(missingIdentifiers('How do I use PhantomClient?', ['OtherClient connects.']),['PhantomClient']);
  assert.deepEqual(missingIdentifiers('How do I use KnownClient?', ['KnownClient connects.']),[]);
  assert.deepEqual(missingIdentifiers('Can I create PhantomClient?', ['OtherClient connects.']),['PhantomClient']);
  assert.deepEqual(missingIdentifiers('How can a Consumer remember progress?', ['A subscriber resumes.']),[]);
});

test('grammatical subjects and possessive owners cannot borrow another entity facts; capitalization is immaterial', () => {
  const text='Marten records completed work. The runtime version of Marten is 3.1. Marten supports Python clients on Windows.';
  for(const query of ['How does Marten record completed work?', 'How does marten record completed work?', "What is Marten's current version?", 'Can Marten clients use Python on Windows?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['How does Nacre record completed work?', 'How does nacre record completed work?', "What is Nacre's current version?", 'Can Nacre clients use Python on Windows?'])assert.equal(passageSupportsRequest(query,text),false,query);
  for(const query of ['How can a Consumer remember progress?', 'How can unfinished activity be stopped?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['Describe Marten record behavior.', 'Explain Marten current version.'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['Describe Nacre record behavior.', 'Explain Nacre current version.', 'Tell me Nacre current version.'])assert.equal(passageSupportsRequest(query,text),false,query);
  assert.equal(passageSupportsRequest('How many moons does Venus have?','The buffer contains 16 entries.'),false);
  assert.equal(passageSupportsRequest('How many chambers does a human heart contain?','The buffer contains 16 entries.'),false);
  assert.equal(passageSupportsRequest('How long can a stored record last?','A stored record expires after thirty seconds.'),true);
  for(const query of ['Can Marten record completed work?', 'How could marten record completed work?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['Can Nacre record completed work?', 'How could nacre record completed work?'])assert.equal(passageSupportsRequest(query,text),false,query);
  for(const query of ['What is Marten used for?', 'What is marten used to record?'])assert.equal(passageSupportsRequest(query,text),true,query);
  for(const query of ['What is Nacre used for?', 'What is nacre used to record?'])assert.equal(passageSupportsRequest(query,text),false,query);
  assert.equal(passageSupportsRequest('What is the capacity of Cedar?','CedarCache capacity is 64 bytes.'),false);
  assert.equal(passageSupportsRequest('How do I use Java?','JavaScript callers record completed work.'),false);
  assert.equal(passageSupportsRequest('How do I use JavaScript?','JavaScript callers record completed work.'),true);
  assert.equal(passageSupportsRequest('How many records does Nacre keep?', 'Marten keeps twelve records.'),false);
});
