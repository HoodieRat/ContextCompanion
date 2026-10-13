import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {fixture} from './helpers.mjs';import * as serena from '../dist/serena.js';
const uvName=process.platform==='win32'?'uv.exe':'uv';
function install(home,nested=false){const dir=path.join(home,'runtime','uv',nested?'asset':'');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,uvName),'owned test executable placeholder');return dir;}
test('Serena locates managed uv in either verified archive layout before inherited PATH',t=>{
 for(const nested of [false,true]){const f=fixture(t),dir=install(f.home,nested),env=serena.serenaEnvironment(f.home);const key=Object.keys(env).filter(k=>k.toLowerCase()==='path');assert.equal(key.length,1);assert.equal(env[key[0]].split(path.delimiter)[0],dir);assert.equal(env.PYTHONNOUSERSITE,'1');assert.equal(env.UV_CACHE_DIR,path.join(f.home,'uv-cache'));}
});
test('Serena refuses absent or ambiguous managed uv rather than relying on a machine-wide install',t=>{
 const f=fixture(t);assert.throws(()=>serena.serenaEnvironment(f.home),/managed uv/i);install(f.home);install(f.home,true);assert.throws(()=>serena.serenaEnvironment(f.home),/ambiguous/i);
});
test('Serena child environment retains credential filtering and does not change parent PATH',t=>{
 const f=fixture(t);install(f.home);const before=process.env.PATH,secret=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='SYNTHETIC_TEST_PROVIDER_TOKEN';t.after(()=>{if(secret===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=secret;});const env=serena.serenaEnvironment(f.home);assert.equal(env.OPENAI_API_KEY,undefined);assert.equal(process.env.PATH,before);assert(env.PATH.split(path.delimiter).includes(path.dirname(process.execPath)));
});
