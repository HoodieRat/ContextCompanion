import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { APP_ROOT } from '../dist/util.js';

test('Windows batch host uses its own hash utility despite inherited Core module paths', { skip: process.platform !== 'win32' }, t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-launcher-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const script = path.join(dir, 'probe.ps1');
  const literal = value => "'" + value.replaceAll("'", "''") + "'";
  fs.writeFileSync(script, `. ${literal(path.join(APP_ROOT, 'scripts/Common.ps1'))}\n$p=Read-Json ${literal(path.join(APP_ROOT, 'dependency-pins.json'))}\n$hash=Get-FileHash -LiteralPath ${literal(path.join(APP_ROOT, 'dependency-pins.json'))}\nif($hash.Hash -notmatch '^[A-F0-9]{64}$'){throw 'Hash not computed'}\n$target=${literal(path.join(dir, 'atomic.json'))}\nWrite-Utf8 $target 'first'\nWrite-Utf8 $target 'replacement'\nif((Get-Content -LiteralPath $target -Raw) -ne 'replacement'){throw 'Atomic replacement failed'}\nWrite-Output 'HASH_OK'\n`);
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${script}"`], { encoding: 'utf8', windowsHide: true, windowsVerbatimArguments: true, timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /HASH_OK/);
});
