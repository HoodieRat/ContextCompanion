import fs from 'node:fs';
import path from 'node:path';
import type { Dependency, Profile } from './types.js';
import { checkedFile } from './security.js';
import { language, platform } from './compatibility.js';
import { AppError, APP_ROOT, object, text, strings, errorText } from './util.js';
import { managedPython } from './runtime.js';
import { run } from './process.js';
export function parseProfile(input: unknown): Profile {
    const v = object(input);
    if (!Array.isArray(v.dependencies) || v.dependencies.length > 1000)
        throw new AppError('Profile requires a dependencies array (up to 1,000).');
    return { languages: strings(v.languages, 50, 80).map(language), platforms: strings(v.platforms, 30, 80).map(platform), apiFamily: v.apiFamily === undefined ? '' : text(v.apiFamily, 'API family', 160, true), dependencies: v.dependencies.map(value => {
            const d = object(value);
            return { name: text(d.name, 'dependency', 160), ecosystem: text(d.ecosystem || 'generic', 'ecosystem', 60), constraint: text(d.constraint || d.resolved || 'unknown', 'constraint', 250), resolved: d.resolved ? text(d.resolved, 'resolved', 160) : undefined,
                confidence: 'manual', workspace: d.workspace === undefined ? '' : text(d.workspace, 'workspace', 500, true), evidence: d.evidence === undefined ? 'User-provided metadata' : text(d.evidence, 'evidence', 1000) };
        }) };
}
export async function detect(root: string, files: string[], home?: string): Promise<{
    profile: Profile;
    warnings: string[];
}> {
    const dependencies: Dependency[] = [];
    const warnings: string[] = [];
    const read = (relative: string) => JSON.parse(fs.readFileSync(checkedFile(root, relative), 'utf8')) as Record<string, unknown>;
    for (const file of files.filter(f => path.basename(f) === 'package.json').slice(0, 100)) {
        try {
            const pkg = read(file), workspace = path.posix.dirname(file) === '.' ? '' : path.posix.dirname(file);
            let lock: Record<string, unknown> = {};
            let lockPath = '';
            for (const candidate of [path.posix.join(workspace, 'package-lock.json'), 'package-lock.json'])
                if (files.includes(candidate)) {
                    lock = read(candidate);
                    lockPath = candidate;
                    break;
                }
            for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
                const values = pkg[field];
                if (!values || typeof values !== 'object' || Array.isArray(values))
                    continue;
                for (const [name, constraint] of Object.entries(values))
                    if (typeof constraint === 'string') {
                        const key = path.posix.join('node_modules', name);
                        const packages = (lock.packages || {}) as Record<string, Record<string, unknown>>;
                        const entry = packages[path.posix.join(workspace, key)] || packages[key] || ((lock.dependencies || {}) as Record<string, Record<string, unknown>>)[name];
                        const resolved = typeof entry?.version === 'string' && /^\d+\.\d+\.\d+(?:[-+].+)?$/.test(entry.version) ? entry.version : undefined;
                        dependencies.push({ name, ecosystem: 'npm', constraint, resolved, confidence: resolved ? 'locked' : 'declared', workspace, evidence: resolved ? `${lockPath}: ${key}.version` : `${file}: ${field}` });
                    }
            }
        }
        catch (error) {
            warnings.push(`Cannot read ${file}: ${errorText(error)}`);
        }
    }
    for (const file of files.filter(f => /^requirements[^/]*\.txt$/i.test(path.basename(f))).slice(0, 100)) {
        for (const line of fs.readFileSync(checkedFile(root, file), 'utf8').split(/\r?\n/)) {
            const m = line.trim().match(/^([A-Za-z0-9][A-Za-z0-9_.-]*)(?:\[[^\]]+\])?\s*([<>=!~].+)?$/);
            if (!m)
                continue;
            dependencies.push({ name: m[1]!, ecosystem: 'pypi', constraint: (m[2] || 'unconstrained').split(';')[0]!.trim(), confidence: 'declared', workspace: path.posix.dirname(file), evidence: `${file}: declared requirement, not proof of installation` });
        }
    }
    // Standard-library TOML parsing avoids guessing exact versions from loosely matched text.
    const manifests = files.filter(f => ['pyproject.toml', 'uv.lock', 'Cargo.toml', 'Cargo.lock'].includes(path.basename(f))).slice(0, 100);
    if (manifests.length && home && fs.existsSync(managedPython(home))) {
        try {
            const r = await run(managedPython(home), ['-I', path.join(APP_ROOT, 'scripts', 'detect_manifests.py'), root, ...manifests], { cwd: root, timeoutMs: 15000 });
            const extra = JSON.parse(r.stdout) as {
                dependencies: Dependency[];
                warnings: string[];
            };
            dependencies.push(...extra.dependencies);
            warnings.push(...extra.warnings);
        }
        catch (error) {
            warnings.push(`TOML detection unavailable: ${errorText(error)}. Add manual metadata; ingestion is unaffected.`);
        }
    }
    else if (manifests.length)
        warnings.push('Managed Python/TOML detection is not installed; TOML manifests remain searchable. Exact versions can be supplied manually.');
    for (const file of files.filter(f => path.basename(f) === 'go.mod').slice(0, 100)) {
        const lines = fs.readFileSync(checkedFile(root, file), 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const m = line.trim().match(/^(?:require\s+)?([\w.-]+\/[\w./-]+)\s+(v[^\s]+)/);
            if (m)
                dependencies.push({ name: m[1]!, ecosystem: 'go', constraint: m[2]!, confidence: 'declared', workspace: path.posix.dirname(file), evidence: file });
        }
    }
    for (const file of files.filter(f => /\.(?:csproj|fsproj|vbproj)$/.test(f)).slice(0, 100)) {
        const xml = fs.readFileSync(checkedFile(root, file), 'utf8');
        for (const match of xml.matchAll(/<PackageReference\b([^>]+)>?/g)) {
            const name = match[1]!.match(/(?:Include|Update)\s*=\s*["']([^"']+)["']/)?.[1];
            const version = match[1]!.match(/Version\s*=\s*["']([^"']+)["']/)?.[1];
            if (name)
                dependencies.push({ name, ecosystem: 'nuget', constraint: version || 'unresolved property/central version', confidence: 'declared', workspace: path.posix.dirname(file), evidence: file });
        }
    }
    const languages = [...new Set(files.map(f => language(path.extname(f).slice(1))).filter(l => ['javascript', 'typescript', 'python', 'rust', 'go', 'csharp', 'cpp', 'c', 'java', 'kotlin', 'ruby', 'php', 'swift', 'lua', 'dart', 'powershell'].includes(l)))];
    if (!languages.length)
        warnings.push('No recognized language was detected. Generic text ingestion and manual profile metadata are available.');
    const unique = [...new Map(dependencies.map(d => [[d.ecosystem, d.name, d.workspace, d.constraint].join('|'), d])).values()];
    return { profile: { languages, platforms: [platform(process.platform)], dependencies: unique, apiFamily: '' }, warnings };
}
