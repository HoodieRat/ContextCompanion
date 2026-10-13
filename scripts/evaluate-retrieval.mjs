/** Frozen original 65-case corpus. This calls the application's real ingestion and retrieval APIs.
 * No fake embeddings, synthetic scores, web services, or mock index are used by this runner.
 * The preserved holdout is evaluated only when explicitly selected.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { api, ensureDaemon } from '../dist/client.js';
import { APP_ROOT, defaultHome, now, hash, writeJson } from '../dist/util.js';
const args = process.argv.slice(2);
const option = (name, fallback = '') => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const home = path.resolve(option('--home', defaultHome())), split = option('--split', 'development'), mode = option('--mode', 'auto'), layout = option('--layout', 'per-file');
if (!['development', 'holdout', 'all'].includes(split) || !['auto', 'lexical'].includes(mode) || !['per-file', 'grouped'].includes(layout))
    throw new Error('Use --split development|holdout|all, --mode auto|lexical and --layout per-file|grouped');
const corpus = path.join(APP_ROOT, 'tests/fixtures/plan-pack');
const caseFile = path.join(corpus, 'retrieval_cases.jsonl');
const cases = fs.readFileSync(caseFile, 'utf8').trim().split('\n').map(JSON.parse).filter(c => split === 'all' || c.split === split);
const report = { at: now(), status: 'blocked', mode, split, sourceLayout: layout, corpusSha256: hash(fs.readFileSync(caseFile)), total: cases.length, tested: 0, results: [], metrics: null, note: 'Frozen initial labels, not a certified benchmark. Read per-case failures; do not tune on holdout. Grouped layout is a separate folder-source measurement, not a pass for the original per-file layout.' };
const output = path.join(home, 'verification', `retrieval-${split}-${mode}${layout === 'grouped' ? '-grouped' : ''}.json`);
try {
    const daemon = await ensureDaemon(home);
    const status = await api(daemon, '/api/status');
    if (!status.installed.groundedDocs)
        throw new Error('Real Grounded Docs runtime is missing; no retrieval cases were executed.');
    if (mode === 'auto' && status.settings.embedding.kind === 'off')
        throw new Error('Hybrid evaluation requires enabled and probed embeddings. Use --mode lexical for a keyword-only measurement.');
    if (mode === 'auto')
        await api(daemon, '/api/embedding/probe', 'POST', {}, 300000);
    report.status = 'running';
    const projects = {};
    for (const name of ['web_project', 'worker_project', 'manual_project']) {
        const root = path.join(corpus, name);
        const registered = await api(daemon, '/api/projects', 'POST', { name: `Retrieval fixture: ${name}`, root, connect: false, indexProject: false }, 120000);
        projects[name] = registered.project;
        const profile = { languages: name === 'web_project' ? ['javascript'] : name === 'worker_project' ? ['python'] : [], platforms: name === 'worker_project' ? ['linux'] : ['windows'], dependencies: [], apiFamily: '' };
        if (name !== 'manual_project')
            profile.dependencies.push({ name: name === 'web_project' ? 'NacreKit' : 'HarborWorker', ecosystem: name === 'web_project' ? 'npm' : 'pypi', constraint: name === 'web_project' ? '2.0.0' : '4.1', resolved: name === 'web_project' ? '2.0.0' : '4.1' });
        await api(daemon, `/api/projects/${registered.project.id}`, 'PUT', { profile, maxSources: 12, budget: 8000 });
        const current = await api(daemon, '/api/status');
        const web = name === 'web_project', worker = name === 'worker_project';
        // Group only identical compatibility metadata. Original paths and files
        // remain the actual ingestion inputs; old-version/Python docs stay separate.
        const prefix = layout === 'grouped' ? 'fixture-grouped' : 'fixture';
        const otherPrefix = layout === 'grouped' ? 'fixture:' : 'fixture-grouped:';
        for (const c of current.collections.filter(c => c.ownerProjectId === registered.project.id && c.name.startsWith(otherPrefix) && c.enabled))
            await api(daemon, `/api/collections/${c.id}`, 'PUT', { enabled: false });
        const definitions = layout === 'grouped' ? [
            { filename: 'compatible-folder', input: path.join(root, 'docs'), exclusions: web ? ['connect_v1.md', 'python_variant.md', '*.html'] : ['*.html'] },
            ...(web ? ['connect_v1.md', 'python_variant.md'].map(filename => ({ filename, input: path.join(root, 'docs', filename), exclusions: [] })) : [])
        ] : fs.readdirSync(path.join(root, 'docs')).filter(f => f.endsWith('.md')).map(filename => ({ filename, input: path.join(root, 'docs', filename), exclusions: [] }));
        for (const { filename, input, exclusions } of definitions) {
            const display = `${prefix}:${name}:${filename}`;
            const previous = current.collections.find(c => c.ownerProjectId === registered.project.id && c.name === display);
            if (previous && !previous.enabled)
                await api(daemon, `/api/collections/${previous.id}`, 'PUT', { enabled: true });
            if (previous?.active)
                continue;
            const old = filename === 'connect_v1.md', py = filename === 'python_variant.md';
            const collection = previous || await api(daemon, '/api/collections', 'POST', {
                projectId: registered.project.id, name: display, kind: 'local', path: input,
                version: web ? old ? '1.0.0' : '2.0.0' : worker ? '4.1' : 'unversioned',
                refreshHours: 0, tags: [], exclusions, maxPages: layout === 'grouped' ? 1000 : 2,
                metadata: { library: web ? 'NacreKit' : worker ? 'HarborWorker' : '', ecosystem: web ? 'npm' : worker ? 'pypi' : 'generic', languages: web ? [py ? 'python' : 'javascript'] : worker ? ['python'] : [], platforms: worker ? ['linux'] : ['windows'], kind: web || worker ? 'api' : 'project_context', reliability: 'user', reliabilityEvidence: 'Synthetic original fixture; not a real API' }
            });
            if (previous)
                await api(daemon, `/api/collections/${previous.id}/refresh`, 'POST', {});
            for (let waited = 0;; waited += 1000) {
                const current = await api(daemon, '/api/status');
                const job = current.jobs.filter(j => j.type === 'index' && j.targetId === collection.id).at(-1);
                if (job && !['running', 'queued'].includes(job.state)) {
                    if (job.state !== 'succeeded')
                        throw new Error(`${display}: ${job.message}`);
                    break;
                }
                if (waited >= 600000)
                    throw new Error('Fixture ingestion exceeded the evaluation deadline.');
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }
    const relative = url => { try {
        if (url.startsWith('file:'))
            return 'fixtures/' + path.relative(corpus, fileURLToPath(url)).replaceAll('\\', '/');
    }
    catch { } return url; };
    for (const c of cases) {
        const start = performance.now();
        const result = await api(daemon, `/api/projects/${projects[c.project].id}/search`, 'POST', { query: c.query, filters: c.filters || {}, mode: mode === 'lexical' ? mode : c.mode || mode }, 90000);
        const top = result.hits.slice(0, 5).map(h => relative(h.url));
        const first = top.findIndex(p => c.relevant_paths.includes(p));
        const forbidden = top.filter(p => (c.forbidden_paths || []).includes(p));
        const passed = c.expected_status === 'no_results' ? result.status === 'no_results' : first >= 0 && !forbidden.length;
        report.results.push({ id: c.id, category: c.category, split: c.split, passed, status: result.status, top5: top, firstRelevantRank: first < 0 ? null : first + 1, forbidden, milliseconds: performance.now() - start, warnings: result.warnings, serializedBytes: result.serializedBytes });
        report.tested++;
        writeJson(output, report);
    }
    const positives = report.results.filter(r => r.category !== 'negative'), latencies = report.results.map(r => r.milliseconds).sort((a, b) => a - b);
    report.metrics = { hitAt5: positives.filter(r => r.firstRelevantRank !== null).length / positives.length, reciprocalRankAt5: positives.reduce((n, r) => n + (r.firstRelevantRank ? 1 / r.firstRelevantRank : 0), 0) / positives.length, forbiddenHits: report.results.reduce((n, r) => n + r.forbidden.length, 0), p95Milliseconds: latencies[Math.max(0, Math.ceil(latencies.length * .95) - 1)], passedCases: report.results.filter(r => r.passed).length };
    report.status = report.results.every(r => r.passed) ? 'passed' : 'failed';
    if (report.status !== 'passed')
        process.exitCode = 1;
}
catch (error) {
    report.error = error.message;
    report.status = report.status === 'running' ? 'failed' : 'blocked';
    process.exitCode = report.status === 'blocked' ? 2 : 1;
}
writeJson(output, report);
console.log(JSON.stringify(report, null, 2));
