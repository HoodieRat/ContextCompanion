import test from 'node:test';import assert from 'node:assert/strict';
import {groundedQuery} from '../dist/grounded.js';
test('lifecycle question scaffolding is omitted only from ranking; object and complete condition remain',()=>{
 for(const [query,expected] of [
  ['What happens to cached sessions when their epoch changes?','cached sessions when their epoch changes?'],
  ['What happens when an approved file is deleted?','when an approved file is deleted?'],
  ['What happens after a locked transaction is cancelled?','after a locked transaction is cancelled?']
 ])assert.equal(groundedQuery(query),expected);
 for(const query of ['What exception does Module.flush raise when empty?','What happens to encrypted sessions when the key is absent?','What happens to Saturn when gravity is reversed?']){
  const actual=groundedQuery(query);for(const term of query.match(/Module\.flush|empty|encrypted|key|absent|Saturn|gravity|reversed/g)||[])assert(actual.includes(term));
 }
 assert.equal(groundedQuery('Explain what happens to cached sessions when their epoch changes.'),'Explain what happens to cached sessions when their epoch changes.');
});
