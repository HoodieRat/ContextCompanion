/** Build a deliberately allowlisted source release, never a snapshot of the private data home. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

if (!process.argv.includes('--reviewed')) {
  console.error('Review source, fixtures, licenses and evidence for private data first; then run node scripts/make-release-manifest.mjs --reviewed.');
  process.exit(2);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directories = ['src', 'dist', 'public', 'scripts', 'docs', 'tests', 'vendor', 'evidence', '.github'];
const roots = ['README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'dependency-pins.json', '.gitignore', '.gitattributes'];
roots.push(...fs.readdirSync(root).filter(name => /^[A-Za-z][A-Za-z-]*\.bat$/.test(name)));
const files = [];
function visit(relative) {
  const normalized = relative.replaceAll(path.sep, '/');
  if (normalized.split('/').some(part => ['.git', 'node_modules', 'runtime', '.runtime', 'models', 'logs', 'backups', 'state.json', 'daemon.json', 'installation.json'].includes(part) || /^\.env(?:\.|$)/.test(part))) {
    throw new Error(`Private or runtime file cannot enter release: ${normalized}`);
  }
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error(`Release refuses symlinks: ${normalized}`);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(absolute).sort()) visit(path.join(relative, child));
    return;
  }
  if (!stat.isFile() || stat.size > 10 * 1024 * 1024) throw new Error(`Unexpected release entry: ${normalized}`);
  const bytes = fs.readFileSync(absolute);
  files.push({ path: normalized, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
for (const entry of [...roots, ...directories]) visit(entry);
files.sort((a, b) => a.path.localeCompare(b.path, 'en'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = { schema: 1, name: pkg.name, version: pkg.version, createdAt: new Date().toISOString(), note: 'Allowlisted source, compiled app, synthetic fixtures and execution evidence only. The manifest itself is excluded from its file list. Hashes detect changes; they are not a publisher signature.', files };
fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Release manifest: ${files.length} files, ${files.reduce((n, f) => n + f.bytes, 0)} bytes. No private runtime or model weights included.`);
