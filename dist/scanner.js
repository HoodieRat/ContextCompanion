import fs from 'node:fs';
import path from 'node:path';
import { AppError, ensureDir, hash, isWithin, writeJson, now } from './util.js';
import { secretName, looksSecret, checkedFile } from './security.js';
import { detect } from './detection.js';
const EXCLUDED_DIRS = new Set(['.git', '.svn', '.hg', '.codex', '.serena', '.ssh', '.aws', '.azure', '.context-companion', 'node_modules', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache', '.next', '.nuxt', 'dist', 'build', 'target', 'coverage', '.idea', '.vs', 'bin', 'obj']);
const EXTENSIONS = new Set(['.txt', '.md', '.mdx', '.markdown', '.rst', '.html', '.htm', '.pdf', '.docx', '.odt', '.rtf', '.csv', '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.cfg', '.py', '.pyi', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.css', '.scss', '.vue', '.svelte', '.c', '.h', '.cpp', '.hpp', '.cs', '.java', '.kt', '.rs', '.go', '.rb', '.php', '.ps1', '.bat', '.cmd', '.sh', '.sql', '.swift', '.lua', '.r', '.dart', '.ex', '.exs', '.erl', '.hs', '.fs', '.gd', '.glsl', '.wgsl', '.csproj', '.fsproj', '.vbproj', '.lock', '.zig', '.clj', '.cljc', '.el', '.pl', '.jl', '.tex']);
const TEXT_ONLY = new Set(['.pdf', '.docx', '.odt', '.rtf']);
function glob(pattern) {
    let out = '';
    const p = pattern.replace(/\\/g, '/').replace(/^\//, '').replace(/\/$/, '/**');
    for (let i = 0; i < p.length; i++) {
        const c = p[i];
        if (c === '*') {
            if (p[i + 1] === '*') {
                out += '.*';
                i++;
            }
            else
                out += '[^/]*';
        }
        else if (c === '?')
            out += '[^/]';
        else
            out += c.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
    return new RegExp(`^(?:${p.includes('/') ? '' : '.*/'}|)${out}(?:/.*)?$`, 'i');
}
export async function scan(rootInput, options = {}) {
    const initial = fs.lstatSync(rootInput);
    if (initial.isSymbolicLink())
        throw new AppError('Select the actual source folder or file, not a symbolic link.');
    const actual = fs.realpathSync(rootInput);
    const root = initial.isDirectory() ? actual : path.dirname(actual);
    const patterns = [...(options.exclusions || [])];
    const ignoreFile = path.join(root, '.contextignore');
    if (fs.existsSync(ignoreFile) && !fs.lstatSync(ignoreFile).isSymbolicLink()) {
        for (const line of fs.readFileSync(ignoreFile, 'utf8').split(/\r?\n/))
            if (line.trim() && !line.trim().startsWith('#'))
                patterns.push(line.trim());
    }
    const ignore = patterns.map(glob);
    const result = { files: [], skipped: [], fingerprint: '' };
    let total = 0;
    let visited = 0;
    const walk = async (location) => {
        if (++visited > 100000)
            throw new AppError('Source has over 100,000 entries. Select a smaller documentation folder.');
        const relative = path.relative(root, location).replace(/\\/g, '/');
        const name = path.basename(location);
        const skip = (reason) => {
            if (result.skipped.length < 2000)
                result.skipped.push({ path: relative, reason });
        };
        if (options.forbiddenRoot && isWithin(options.forbiddenRoot, location)) {
            skip('Application-private data');
            return;
        }
        if (relative && (name.startsWith('.') || EXCLUDED_DIRS.has(name.toLowerCase()) || ignore.some(re => re.test(relative)))) {
            skip('Hidden, generated, or explicitly excluded');
            return;
        }
        const info = fs.lstatSync(location);
        if (info.isSymbolicLink()) {
            skip('Symbolic link');
            return;
        }
        if (info.isDirectory()) {
            const entries = fs.readdirSync(location).sort();
            for (const entry of entries)
                await walk(path.join(location, entry));
            return;
        }
        if (!info.isFile()) {
            skip('Not a regular file');
            return;
        }
        if (secretName(relative)) {
            skip('Sensitive filename');
            return;
        }
        const generic = !EXTENSIONS.has(path.extname(name).toLowerCase()) && !['license', 'readme', 'dockerfile', 'makefile'].includes(name.toLowerCase());
        if (/\.(?:exe|dll|so|dylib|bin|zip|7z|rar|tar|gz|jpg|jpeg|png|webp|mp4|mp3|woff2?|ttf|onnx|gguf|pkl|pickle)$/i.test(name)) {
            skip('Unsupported binary/archive format');
            return;
        }
        if (info.size > 10 * 1024 * 1024) {
            skip('File exceeds 10 MiB');
            return;
        }
        if (result.files.length >= (options.maxFiles ?? 10000))
            throw new AppError('Source exceeds 10,000 eligible files. Split it into smaller libraries.');
        total += info.size;
        if (total > (options.maxTotal ?? 200 * 1024 * 1024))
            throw new AppError('Source exceeds the 200 MiB staging limit. Split it into smaller libraries.');
        const contents = await fs.promises.readFile(location);
        if (!TEXT_ONLY.has(path.extname(name).toLowerCase()) && (contents.includes(0) || looksSecret(contents))) {
            skip('Binary content or possible embedded credential');
            return;
        }
        if (generic) {
            try {
                new TextDecoder('utf-8', { fatal: true }).decode(contents);
            }
            catch {
                skip('Unknown non-UTF8 format');
                return;
            }
        }
        result.files.push({ relative, absolute: location, hash: hash(contents), size: info.size, ...(generic ? { stagedRelative: `__generic/${hash(relative).slice(0, 16)}/${name}.txt` } : {}) });
        if (result.files.length % 25 === 0)
            await new Promise(resolve => setImmediate(resolve));
    };
    await walk(actual);
    result.fingerprint = hash(result.files.map(file => `${file.relative}\0${file.hash}`).join('\n'));
    return result;
}
export async function snapshot(source, destination, exclusions, forbiddenRoot) {
    const found = await scan(source, { exclusions, forbiddenRoot });
    ensureDir(destination);
    for (const file of found.files) {
        const safe = checkedFile(fs.statSync(source).isDirectory() ? fs.realpathSync(source) : path.dirname(fs.realpathSync(source)), file.relative);
        const contents = await fs.promises.readFile(safe);
        if (hash(contents) !== file.hash || fs.lstatSync(file.absolute).isSymbolicLink())
            throw new AppError('A source file changed while staging. Retry Refresh.');
        const target = path.join(destination, file.stagedRelative || file.relative);
        ensureDir(path.dirname(target));
        await fs.promises.writeFile(target, contents, { mode: 0o600 });
    }
    return found;
}
export async function projectMap(project, home) {
    const found = await scan(project.root, { maxFiles: 10000 });
    const files = found.files.map(f => f.relative);
    const detection = await detect(project.root, files, home);
    let architecture = '';
    for (const candidate of ['ARCHITECTURE.md', 'docs/ARCHITECTURE.md', 'architecture.md'])
        if (files.includes(candidate)) {
            architecture = fs.readFileSync(checkedFile(project.root, candidate), 'utf8').slice(0, 16000);
            break;
        }
    return { generatedAt: now(), fingerprint: found.fingerprint, languages: detection.profile.languages, dependencies: Object.fromEntries(detection.profile.dependencies.map(d => [d.name, d.resolved || d.constraint])), dependencyEvidence: detection.profile.dependencies, profile: detection.profile, files: files.slice(0, 600), totalFiles: files.length, warnings: detection.warnings, architecture };
}
export function saveMap(home, project, map) { writeJson(path.join(home, 'projects', project.id, 'map.json'), map); }
//# sourceMappingURL=scanner.js.map