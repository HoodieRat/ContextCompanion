import path from 'node:path';
import fs from 'node:fs';
import { isUtf8 } from 'node:buffer';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { AppError, APP_ROOT, ensureDir, now, id, writeJson, readJson, hash, object, requireId, isWithin } from './util.js';
import { snapshot, scan } from './scanner.js';
import { cleanEnvironment, run } from './process.js';
import { publicUrl } from './security.js';
import { declaredApiContext } from './api-context.js';
import { createRequire } from 'node:module';
import { declaredCodeContext } from './code-context.js';
import { requiredIdentifiers } from './support.js';
import { gitSnapshot } from './repositories.js';
/** Remove only first-person question scaffolding from upstream ranking.
 * Keep the action, qualifiers and identifiers; support checks use the original
 * request. No extra query/process or alternate retrieval engine is introduced.
 */
export function instructionRequest(query) {
    const trimmed = query.trim();
    const emphasis = trimmed.match(/^(\*\*|__|\*)([\s\S]+)\1\s*(\?)?$/);
    const request = emphasis ? emphasis[2].trim() + (emphasis[3] || '') : trimmed;
    return /^how\s+(?:do|can|could|should)\s+(?:i|we|you)\s+/i.test(request) ? request : query;
}
export function instructionTask(query) {
    const request = instructionRequest(query).trim();
    const task = request.replace(/^how\s+(?:do|can|could|should)\s+(?:i|we|you)\s+/i, '');
    if (task === request)
        return undefined;
    // Presentation/tool-use directives after a complete question can rank
    // integration commentary ahead of its actual setup instructions. Remove
    // only an entirely recognized suffix from ranking, never from support.
    // Extra operations, qualifiers, identifiers and quoted examples remain.
    const question = task.match(/^([^?\n]+)\?\s+([\s\S]+)$/);
    if (question) {
        const directive = /^(?:please\s+)?(?:cite\s+(?:the\s+)?(?:supporting\s+documentation|documentation|sources?|references)|(?:answer|respond)\s+(?:using|with)\s+(?:only\s+)?(?:the\s+)?(?:supplied|provided|indexed)\s+(?:evidence|context)(?:\s+only)?|do\s+not\s+(?:call|use)\s+tools)(?:[.!]\s*|$)/i;
        let suffix = question[2].trim();
        while (suffix) {
            const match = suffix.match(directive);
            if (!match)
                break;
            suffix = suffix.slice(match[0].length).trim();
        }
        if (!suffix)
            return question[1].trim() || undefined;
    }
    return task.replace(/\?\s*$/, '').trim() || undefined;
}
export function groundedQuery(query, codeProject) {
    let task = instructionTask(query) ?? query;
    // Lifecycle scaffolding is not the subject being looked up. Keep the
    // actual object and every temporal/conditional qualifier in ranking;
    // declaration and support checks still receive the complete request.
    task = task.replace(/^what\s+happens\s+to\s+/i, '').replace(/^what\s+happens\s+(?=(?:when|after|if|unless|until)\b)/i, '');
    if (!codeProject)
        return task;
    const name = codeProject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    task = task.replace(new RegExp(`^(?:in|for)\\s+${name}\\s+project(?:'s)?\\s+source code,\\s*`, 'i'), '');
    // A large-file chunk may omit the class header. Search the member spelling
    // within this already project-bound source; the complete original API name
    // must still be proved by the returned text/declaration before delivery.
    return task.replace(/\b[A-Z][A-Za-z0-9_$]*\.([a-z_$][A-Za-z0-9_$]*)\b/g, '$1');
}
/** Do not invent a GitHub-style file viewer URL for an unknown Git host. */
export function repositoryFileUrl(repository, commit, relative) {
    const parsed = new URL(repository);
    const base = repository.replace(/\.git\/?$/, '').replace(/\/$/, '');
    const file = relative.split('/').map(encodeURIComponent).join('/');
    if (parsed.hostname === 'github.com')
        return `${base}/blob/${commit}/${file}`;
    if (parsed.hostname === 'gitlab.com')
        return `${base}/-/blob/${commit}/${file}`;
    if (parsed.hostname === 'bitbucket.org')
        return `${base}/src/${commit}/${file}`;
    return repository; // Separate filePath and commit provenance identify the file without a guessed viewer URL.
}
export function inventoryVersion(input, library, version) {
    if (!Array.isArray(input))
        throw new AppError('Unexpected Grounded Docs inventory shape.', 502);
    const row = input.map(v => object(v)).find(v => v.name === library);
    if (!row || !Array.isArray(row.versions))
        throw new AppError('Requested library was not indexed. Previous index retained.');
    const found = row.versions.map(v => object(v)).find(v => v.version === version);
    if (!found || typeof found.documentCount !== 'number' || found.documentCount < 1 || typeof found.uniqueUrlCount !== 'number' || found.uniqueUrlCount < 1)
        throw new AppError('No usable document chunks were indexed. Empty, scanned or unsupported inputs need a text conversion; no success was claimed.');
    const status = String(found.status).toLowerCase();
    if (!['completed', 'complete', 'indexed'].includes(status))
        throw new AppError(`Upstream index is ${status}, not completed. Previous index retained.`);
    return { documentCount: found.documentCount, uniqueUrlCount: found.uniqueUrlCount, status };
}
/** Retry only text omitted by a successful conversion. Grounded still converts and stores it. */
export function restageMissingText(root, files, integrity) {
    const pages = new Set((Array.isArray(integrity.databases) ? integrity.databases : []).flatMap(db => {
        const pages = object(db).pages;
        return Array.isArray(pages) ? pages.filter((p) => typeof p === 'string').map(p => p.split('#')[0]) : [];
    }));
    const retried = [];
    for (const file of files) {
        const original = path.join(root, file.stagedPath);
        if (pages.has(pathToFileURL(original).href) || /\.(pdf|docx|odt|rtf)$/i.test(file.path))
            continue;
        if (!isWithin(root, original) || fs.lstatSync(original).isSymbolicLink())
            throw new AppError('Unsafe staged text path.', 403);
        const bytes = fs.readFileSync(original);
        if (!bytes.length || bytes.includes(0))
            continue;
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        catch {
            continue;
        }
        if (hash(bytes) !== file.hash)
            throw new AppError('Staged text changed before conversion retry.');
        const stagedPath = `__raw_utf8/${hash(file.path).slice(0, 16)}/${path.basename(file.path)}.txt`;
        const target = path.join(root, stagedPath);
        ensureDir(path.dirname(target));
        fs.writeFileSync(target, bytes, { mode: 0o600 });
        fs.unlinkSync(original);
        file.stagedPath = stagedPath;
        file.conversion = 'raw_utf8_fallback';
        retried.push(file.path);
    }
    return retried;
}
export class Grounded {
    home;
    embeddings;
    codeParser;
    codeParserUnavailable = false;
    codeContext(source, passage, request) {
        if (this.codeParserUnavailable)
            return;
        if (!this.codeParser) {
            try {
                const require = createRequire(this.entry);
                const Parser = require('tree-sitter');
                const language = require('tree-sitter-typescript');
                const parser = new Parser();
                parser.setLanguage(language.typescript);
                this.codeParser = parser;
            }
            catch {
                this.codeParserUnavailable = true;
                return;
            }
        }
        try {
            // Tree-sitter 0.21's default input buffer rejects longer strings.
            // Bound the buffer to the already bounded snapshot, including UTF-16.
            const tree = this.codeParser.parse(source, null, { bufferSize: Math.max(32768, source.length * 2 + 1024) });
            try {
                return declaredCodeContext(source, passage, tree.rootNode, requiredIdentifiers(request));
            }
            finally {
                tree.delete?.();
            }
        }
        catch {
            return; /* A failed passage cannot disable subsequent corroboration. */
        }
    }
    slot = 0;
    waiting = 0;
    slots = Array.from({ length: 4 }, () => Promise.resolve());
    constructor(home, embeddings) {
        this.home = home;
        this.embeddings = embeddings;
    }
    get entry() { return path.join(this.home, 'runtime', 'docs', 'node_modules', '@arabold', 'docs-mcp-server', 'dist', 'index.js'); }
    available() { return fs.existsSync(this.entry); }
    generationDir(collectionId, generationId) { return path.join(this.home, 'collections', requireId(collectionId), 'generations', requireId(generationId)); }
    async options(collection, generation, readOnly, keywordFallback = false) {
        if (!this.available())
            throw new AppError('Grounded Docs is not installed. Run Install.bat to install or repair the managed runtime.', 503);
        const dir = this.generationDir(collection.id, generation.id);
        ensureDir(dir);
        const cwd = path.join(this.home, 'runtime', 'work');
        ensureDir(cwd);
        const connection = keywordFallback ? undefined : await this.embeddings.connection(generation.profile);
        const config = path.join(dir, readOnly ? (keywordFallback ? 'search-keyword.json' : 'search.json') : 'index.json');
        writeJson(config, {
            app: { storePath: path.join(dir, 'store'), telemetryEnabled: false, readOnly, ...(connection ? { embeddingModel: connection.model } : {}) },
            server: { protocol: 'stdio', host: '127.0.0.1' },
            scraper: { maxPages: collection.maxPages, maxDepth: collection.maxDepth, maxConcurrency: 2, document: { maxSize: 10 * 1024 * 1024 },
                security: { network: { mode: 'open', allowPrivateNetworks: false, allowInvalidTls: false }, fileAccess: { mode: 'allowedRoots', allowedRoots: generation.snapshotRoot ? [generation.snapshotRoot] : [], followSymlinks: false, includeHidden: false } } },
            splitter: { minChunkSize: 150, preferredChunkSize: 1500, maxChunkSize: 5000 },
            embeddings: { batchSize: 4, batchChars: 16000, requestTimeoutMs: 120000, initTimeoutMs: 120000, ...(connection ? { vectorDimension: connection.dimensions } : {}) }
        });
        // Upstream CLI middleware resolves its store before reading --config,
        // then applies that value over app.storePath. Bind both explicitly.
        const env = cleanEnvironment({ DOCS_MCP_STORE_PATH: path.join(dir, 'store'), DOCS_MCP_APP_TELEMETRY_ENABLED: 'false', DOCS_MCP_TELEMETRY: 'false', PLAYWRIGHT_BROWSERS_PATH: path.join(this.home, 'browsers'), PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
            ...(connection ? { OPENAI_API_KEY: connection.token, OPENAI_API_BASE: connection.baseUrl, DOCS_MCP_EMBEDDING_MODEL: connection.model, DOCS_MCP_EMBEDDINGS_VECTOR_DIMENSION: String(connection.dimensions) } : {}) });
        // Short-lived read-only searches pay cache lookup/write/exit-flush costs
        // on the query deadline. Keep compilation caching for ingestion only.
        // Grounded still owns conversion, indexing and retrieval.
        if (readOnly)
            env.NODE_DISABLE_COMPILE_CACHE = '1';
        else
            env.NODE_COMPILE_CACHE = path.join(this.home, 'runtime', 'node-compile-cache');
        return { config, env, cwd };
    }
    async inspect(collection, generation, signal) {
        const store = path.join(this.generationDir(collection.id, generation.id), 'store');
        const result = await run(process.execPath, [path.join(APP_ROOT, 'scripts', 'db-tools.mjs'), 'inspect', this.home, store], { cwd: APP_ROOT, signal, timeoutMs: 120000 });
        return object(JSON.parse(result.stdout));
    }
    async build(collection, profile, logFile, signal) {
        if (!this.available())
            throw new AppError('Grounded Docs is not installed. Run Install.bat.', 503);
        ensureDir(path.dirname(logFile));
        // Hash-based incremental short circuit: unchanged local data never gets re-embedded.
        if ('path' in collection.source && collection.active && !collection.needsRefresh && JSON.stringify(collection.active.profile) === JSON.stringify(profile)) {
            const check = await scan(collection.source.path, { exclusions: collection.exclusions, forbiddenRoot: collection.source.kind === 'managed' ? path.join(this.home, 'runtime') : this.home });
            if (check.fingerprint === collection.active.sourceFingerprint) {
                fs.appendFileSync(logFile, 'Unchanged source and embedding identity; retained the published generation.\n');
                return collection.active;
            }
        }
        if (profile.kind !== 'off')
            await this.embeddings.probe(profile);
        const generation = { id: id(), createdAt: now(), profile: structuredClone(profile), sourceFingerprint: '', files: 0, skipped: 0, lastGood: false, sourceRevision: collection.revision || 1, upstreamVersion: '3.2.1' };
        const dir = this.generationDir(collection.id, generation.id);
        ensureDir(dir);
        let sourceUrl;
        let preservedWeb = false;
        try {
            if (collection.source.kind === 'url') {
                sourceUrl = await publicUrl(collection.source.url);
                generation.sourceFingerprint = hash(sourceUrl + '\n' + generation.createdAt);
                // A bounded web refresh cannot prove deletion of unvisited pages. Reuse the prior store and never clean it.
                if (collection.active && !collection.needsRefresh && JSON.stringify(collection.active.profile) === JSON.stringify(profile)) {
                    const previous = path.join(this.generationDir(collection.id, collection.active.id), 'store');
                    if (fs.existsSync(previous)) {
                        fs.cpSync(previous, path.join(dir, 'store'), { recursive: true, dereference: false });
                        preservedWeb = true;
                    }
                }
            }
            else {
                const git = collection.source.kind === 'git' ? await gitSnapshot(collection.source.url, collection.source.ref, path.join(dir, 'checkout'), logFile, signal) : undefined;
                const source = git?.root || ('path' in collection.source ? collection.source.path : '');
                generation.commit = git?.commit;
                generation.snapshotRoot = path.join(dir, 'snapshot');
                generation.originalRoot = fs.statSync(source).isDirectory() ? fs.realpathSync(source) : path.dirname(fs.realpathSync(source));
                const found = await snapshot(source, generation.snapshotRoot, collection.exclusions, collection.source.kind === 'managed' || collection.source.kind === 'git' ? path.join(this.home, 'runtime') : this.home);
                generation.files = found.files.length;
                generation.skipped = found.skipped.length;
                generation.sourceFingerprint = found.fingerprint;
                writeJson(path.join(dir, 'scan-report.json'), { files: found.files.map(f => ({ path: f.relative, stagedPath: f.stagedRelative || f.relative, size: f.size, hash: f.hash })), skipped: found.skipped });
                fs.appendFileSync(logFile, `Staged ${generation.files} files; ${generation.skipped} entries excluded. See scan-report.json.\n`);
                if (!found.files.length)
                    throw new AppError('No eligible documents remain after file filtering. Check the source path and exclusions.');
                if (found.files.length > collection.maxPages && !collection.allowPartial)
                    throw new AppError('More staged files than the configured page limit. Raise the limit or narrow the source; a partial replacement was not published.');
                sourceUrl = pathToFileURL(generation.snapshotRoot + path.sep).href;
            }
            const options = await this.options(collection, generation, false);
            const args = [this.entry, '--config', options.config, 'scrape', collection.id, sourceUrl, '--version', collection.version,
                '--max-pages', String(collection.maxPages), '--max-depth', String(collection.maxDepth), '--max-concurrency', '2', '--scrape-mode', collection.scrapeMode,
                '--scope', 'subpages', '--ignore-errors', 'false', '--clean', preservedWeb ? 'false' : 'true'];
            if (collection.source.kind === 'url')
                for (const excluded of collection.exclusions)
                    args.push('--exclude-pattern', excluded);
            await run(process.execPath, args, { ...options, logFile, timeoutMs: 45 * 60 * 1000, signal, maxOutput: 32 * 1024 * 1024 });
            const check = await run(process.execPath, [this.entry, '--config', options.config, 'list', '--output', 'json'], { ...options, timeoutMs: 30000, signal });
            const libraries = JSON.parse(check.stdout.trim());
            writeJson(path.join(dir, 'inventory.json'), libraries);
            let counts = inventoryVersion(libraries, collection.id, collection.version);
            generation.integrity = await this.inspect(collection, generation, signal);
            if (generation.snapshotRoot && counts.uniqueUrlCount < generation.files) {
                const scanReport = readJson(path.join(dir, 'scan-report.json'));
                writeJson(path.join(dir, 'initial-conversion-receipt.json'), { ...counts, staged: generation.files, integrity: generation.integrity, files: scanReport.files });
                const retried = restageMissingText(generation.snapshotRoot, scanReport.files, generation.integrity);
                if (retried.length) {
                    writeJson(path.join(dir, 'scan-report.json'), scanReport);
                    fs.appendFileSync(logFile, `Retrying omitted UTF-8 text through Grounded plain-text input: ${retried.join(', ')}. Raw source syntax is retained; rendered fidelity is not claimed.\n`);
                    await run(process.execPath, args, { ...options, logFile, timeoutMs: 45 * 60 * 1000, signal, maxOutput: 32 * 1024 * 1024 });
                    const retry = await run(process.execPath, [this.entry, '--config', options.config, 'list', '--output', 'json'], { ...options, timeoutMs: 30000, signal });
                    const inventory = JSON.parse(retry.stdout.trim());
                    writeJson(path.join(dir, 'inventory.json'), inventory);
                    counts = inventoryVersion(inventory, collection.id, collection.version);
                    generation.integrity = await this.inspect(collection, generation, signal);
                }
            }
            writeJson(path.join(dir, 'integrity.json'), generation.integrity);
            generation.coverage = collection.source.kind === 'url' ? 'unknown' : counts.uniqueUrlCount < generation.files ? 'partial' : 'complete';
            writeJson(path.join(dir, 'ingestion-receipt.json'), { ...counts, staged: generation.files, excluded: generation.skipped, coverage: generation.coverage, preservedUnvisitedWebPages: preservedWeb, note: collection.source.kind === 'url' ? 'Coverage is bounded; absence is not evidence of deletion. Unvisited pages retained on compatible refresh.' : 'URL counts are a coarse coverage check, not proof of fidelity for every input.' });
            if (generation.coverage === 'partial' && !collection.allowPartial)
                throw new AppError('Not every staged file produced a stored page. Review the ingestion receipt; convert unsupported/scanned documents or explicitly allow partial coverage. The previous generation remains active.');
            generation.lastGood = true;
            writeJson(path.join(dir, 'generation.json'), generation);
            return generation;
        }
        catch (error) {
            writeJson(path.join(dir, 'generation.json'), generation);
            throw error;
        }
    }
    async search(collection, query, limit, signal, keywordFallback = false, request = query, codeProject) {
        if (this.waiting >= 48)
            throw new AppError('Grounded search queue is full. Retry shortly.', 429);
        const slot = this.slot++ % this.slots.length, previous = this.slots[slot];
        let release;
        const done = new Promise(resolve => { release = resolve; });
        this.slots[slot] = previous.then(() => done);
        this.waiting++;
        let abort;
        try {
            await Promise.race([previous, new Promise((_, reject) => {
                    abort = () => reject(new AppError('Retrieval cancelled.', 499));
                    if (signal?.aborted)
                        abort();
                    else
                        signal?.addEventListener('abort', abort, { once: true });
                })]);
            return await this.searchNow(collection, query, limit, signal, keywordFallback, request, codeProject);
        }
        finally {
            signal?.removeEventListener('abort', abort);
            this.waiting--;
            release();
        }
    }
    async searchNow(collection, query, limit, signal, keywordFallback = false, request = query, codeProject) {
        if (!collection.active)
            return [];
        const generation = collection.active;
        const options = await this.options(collection, generation, true, keywordFallback);
        const result = await run(process.execPath, [this.entry, '--config', options.config, 'search', collection.id, groundedQuery(query, collection.metadata?.kind === 'project_context' ? codeProject : undefined), '--version', collection.version, '--exact-match', '--limit', String(limit), '--output', 'json'], { ...options, timeoutMs: 45000, signal });
        const parsed = JSON.parse(result.stdout.trim());
        if (!Array.isArray(parsed))
            throw new AppError('Unexpected Grounded Docs search schema.', 502);
        let mapping = [];
        try {
            mapping = readJson(path.join(this.generationDir(collection.id, generation.id), 'scan-report.json')).files;
        }
        catch { /*Web sources do not have staged-file mapping.*/ }
        return parsed.slice(0, limit).map(item => {
            const hit = object(item);
            if (typeof hit.url !== 'string' || typeof hit.content !== 'string')
                throw new AppError('Grounded Docs search result lacks its source URL or text.', 502);
            const rawUrl = typeof hit.contentUrl === 'string' ? hit.contentUrl : hit.url;
            let url = rawUrl;
            let filePath;
            let originalHash;
            let conversion;
            let apiContext;
            let content = hit.content;
            if (generation.snapshotRoot && rawUrl.startsWith('file:')) {
                const local = fileURLToPath(rawUrl.split('#')[0]);
                if (!isWithin(generation.snapshotRoot, local))
                    throw new AppError('Upstream search returned a path outside its approved snapshot.', 403);
                const staged = path.relative(generation.snapshotRoot, local).replace(/\\/g, '/');
                const mapped = mapping.find(m => m.stagedPath === staged);
                const original = mapped?.path || staged;
                filePath = original;
                originalHash = mapped?.hash;
                conversion = mapped?.conversion;
                // Only the approved immutable snapshot can corroborate scope.
                // No source label or arbitrary metadata supplies an API name.
                if (mapped && /\.(?:rst|md|mdx|txt|ts|js|mjs|cjs)$/i.test(mapped.stagedPath) && fs.statSync(local).size <= 200000) {
                    const bytes = fs.readFileSync(local);
                    if (isUtf8(bytes) && hash(bytes) === mapped.hash) {
                        const source = bytes.toString('utf8');
                        apiContext = /\.(?:ts|js|mjs|cjs)$/i.test(mapped.stagedPath) ? this.codeContext(source, hit.content, request) : declaredApiContext(source, hit.content, requiredIdentifiers(request));
                        if (apiContext?.sourceExcerpt)
                            content = source.slice(apiContext.sourceExcerpt.start, apiContext.sourceExcerpt.end);
                    }
                }
                if (collection.source.kind === 'git' && generation.commit) {
                    url = repositoryFileUrl(collection.source.url, generation.commit, original);
                }
                else if (generation.originalRoot)
                    url = pathToFileURL(path.join(generation.originalRoot, original)).href;
            }
            return { url, rawUrl, filePath, originalHash, conversion, apiContext, content, score: typeof hit.score === 'number' ? hit.score : null };
        });
    }
    similarities(query, passages, profile, signal) {
        return this.embeddings.similarities(query, passages, profile, signal);
    }
}
//# sourceMappingURL=grounded.js.map