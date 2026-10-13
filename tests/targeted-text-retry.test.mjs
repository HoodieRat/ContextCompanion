import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {restageMissingText} from '../dist/grounded.js';
import {hash} from '../dist/util.js';
test('omitted UTF-8 retries preserve bytes and mapping; stored and binary inputs remain untouched', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cc-text-retry-'));
 try {
  const inputs={'short.html':'<p>Independent retained text.</p>','kept.css':'p { color: blue; }','binary.pdf':'not decoded as plain text','invalid.txt':Buffer.from([0xff]),'nul.txt':Buffer.from([0])};
  const files=Object.entries(inputs).map(([name,bytes])=>{fs.writeFileSync(path.join(root,name),bytes);return {path:name,stagedPath:name,size:Buffer.byteLength(bytes),hash:hash(bytes)};});
  const original=fs.readFileSync(path.join(root,'short.html'));
  assert.deepEqual(restageMissingText(root,files,{databases:[{pages:[pathToFileURL(path.join(root,'kept.css')).href]}]}),['short.html']);
  assert.equal(files[0].conversion,'raw_utf8_fallback');
  assert.deepEqual(fs.readFileSync(path.join(root,files[0].stagedPath)),original);
  assert.equal(files[0].hash,hash(original));
  for(const name of Object.keys(inputs).slice(1))assert(fs.existsSync(path.join(root,name)));
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
