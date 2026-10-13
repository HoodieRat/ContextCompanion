// Shared npm/native selection. Every top-level test must be explicitly accounted for.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {spawn,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const suites=JSON.parse(fs.readFileSync(path.join(root,'tests/suites.json')));
const suite=process.argv[2]||'baseline';assert(['baseline','research','diagnostic'].includes(suite),'Unknown test suite');
const all=[...suites.baseline,...suites.research];assert.equal(new Set(all).size,all.length,'Duplicate test assignment');
assert.deepEqual([...all].sort(),fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.mjs')).sort(),'Every test file must be assigned; do not silently omit new checks');
const files=(suite==='diagnostic'?all:suites[suite]).map(f=>'tests/'+f);
assert(files.length>0,'An empty suite is not a pass');
console.log('Suite: '+suite+'; baseline verifies the restored production integration; inactive matcher research remains unresolved. Controlled units are not live upstream acceptance.');
console.log('Files: '+JSON.stringify(files));
const args=['--test','--test-timeout=10000','--test-concurrency=1',...files];
console.log('Command: '+JSON.stringify({executable:process.execPath,arguments:args,cwd:root,outerDeadlineMilliseconds:120000}));
const child=spawn(process.execPath,args,{cwd:root,windowsHide:true,stdio:'inherit'});
let timedOut=false;
const timer=setTimeout(()=>{timedOut=true;console.error('FAIL: suite exceeded 120 seconds.');if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'inherit'});else child.kill();},120000);
child.on('error',error=>{clearTimeout(timer);console.error(error);process.exitCode=1;});
child.on('close',code=>{clearTimeout(timer);process.exitCode=timedOut?124:code??1;console.log('Suite exit: '+process.exitCode);});
