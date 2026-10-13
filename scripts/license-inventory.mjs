/** Inventory exact installed dependency licenses. Unknown licenses are reported, never assumed permissive. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readJson, writeJson } from '../dist/util.js';
const home = process.argv[2];
if (!home)
    throw new Error('Usage: license-inventory.mjs HOME');
const rows = [];
const seen = new Set();
function walk(dir) { if (!fs.existsSync(dir))
    return; for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (item.isSymbolicLink() || !item.isDirectory())
        continue;
    const file = path.join(dir, item.name, 'package.json');
    if (fs.existsSync(file)) {
        try {
            const p = readJson(file), key = p.name + '@' + p.version;
            if (!seen.has(key)) {
                seen.add(key);
                rows.push({ ecosystem: 'npm', name: p.name, version: p.version, license: typeof p.license === 'string' ? p.license : JSON.stringify(p.license || 'UNKNOWN'), path: path.relative(home, file) });
            }
        }
        catch { }
    }
    walk(path.join(dir, item.name, 'node_modules'));
    if (item.name.startsWith('@'))
        walk(path.join(dir, item.name));
} }
for (const name of ['docs', 'embeddings'])
    walk(path.join(home, 'runtime', name, 'node_modules'));
const python = readJson(path.join(home, 'installation.json')).python;
const code = "import importlib.metadata as m,json;print(json.dumps([dict(ecosystem='pypi',name=d.metadata.get('Name',''),version=d.version,license=d.metadata.get('License-Expression') or d.metadata.get('License') or 'UNKNOWN') for d in m.distributions()]))";
const r = spawnSync(python, ['-I', '-c', code], { encoding: 'utf8', timeout: 30000 });
if (r.status !== 0)
    throw new Error(r.stderr || 'Python license inventory failed');
rows.push(...JSON.parse(r.stdout));
rows.sort((a, b) => a.name.localeCompare(b.name));
const report = { createdAt: new Date().toISOString(), packages: rows, unknown: rows.filter(r => r.license === 'UNKNOWN').map(r => r.name), notice: 'License inventory is not legal clearance. Keep source notices and satisfy upstream licenses when redistributing dependencies.' };
writeJson(path.join(home, 'dependency-licenses.json'), report);
console.log(`Saved ${rows.length} dependency license records; ${report.unknown.length} unknown.`);
