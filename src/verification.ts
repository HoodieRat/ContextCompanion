import fs from 'node:fs';
import path from 'node:path';
import type { Collection, Project } from './types.js';
import { Store } from './state.js';
import { Grounded } from './grounded.js';
import { Embeddings } from './embeddings.js';
import { Serena } from './serena.js';
import { ensureDir, id, now, object, errorText, AppError, writeJson } from './util.js';
export type Verification = {
    at: string;
    platform: string;
    checks: {
        name: string;
        passed: boolean;
        detail: string;
    }[];
    passed: boolean;
};
export async function verify(store: Store, grounded: Grounded, embeddings: Embeddings, logFile: string, signal: AbortSignal): Promise<Verification> {
    const runId = id();
    const dir = path.join(store.home, 'verification', runId);
    ensureDir(dir);
    const project: Project = { id: runId, name: 'Live verification fixture', root: dir, collections: [], budget: 2000, maxSources: 4, hooks: false, linked: false, checks: [], createdAt: now() };
    fs.writeFileSync(path.join(dir, 'machine.py'), 'def calibrate_joint(value: float) -> float:\n    """Multiply a joint calibration value by two."""\n    return value * 2\n\ndef run_machine() -> float:\n    return calibrate_joint(4.0)\n');
    fs.writeFileSync(path.join(dir, 'README.md'), '# Joint calibration\n\nThe calibrate_joint function doubles its numeric input. The cobalt calibration identifier is CCVERIFY7391.\n');
    const report: Verification = { at: now(), platform: process.platform, checks: [], passed: false };
    const check = async (name: string, fn: () => Promise<string>) => {
        if (signal.aborted)
            throw new AppError('Verification cancelled.', 499);
        try {
            const detail = await fn();
            report.checks.push({ name, passed: true, detail });
            fs.appendFileSync(logFile, `PASS ${name}: ${detail}\n`);
        }
        catch (error) {
            const detail = errorText(error);
            report.checks.push({ name, passed: false, detail });
            fs.appendFileSync(logFile, `FAIL ${name}: ${detail}\n`);
        }
    };
    await check('Local/external embedding response', async () => JSON.stringify(await embeddings.probe(store.data.settings.embedding)));
    let searchable: Collection | undefined;
    await check('Real Grounded Docs ingestion and exact-version retrieval', async () => {
        const collection: Collection = { id: runId, name: 'Live verification', version: 'verify-1', tags: [], ownerProjectId: runId, source: { kind: 'managed', path: dir }, maxPages: 10, maxDepth: 2, refreshHours: 0, exclusions: [], scrapeMode: 'fetch', createdAt: now() };
        const generation = await grounded.build(collection, store.data.settings.embedding, logFile, signal);
        searchable = { ...collection, active: generation };
        const hits = await grounded.search(searchable, 'CCVERIFY7391', 5, signal);
        if (!hits.some(hit => hit.content.includes('CCVERIFY7391')))
            throw new AppError('The known fixture marker was not retrieved.');
        return `Retrieved the known marker from ${hits.length} real search result(s).`;
    });
    if (store.data.settings.embedding.kind !== 'off')
        await check('Real semantic retrieval', async () => {
            if (!searchable)
                throw new AppError('Ingestion must pass before semantic retrieval can be verified.');
            const hits = await grounded.search(searchable, 'How are numeric joint adjustment values doubled?', 5, signal);
            if (!hits.some(h => h.content.includes('calibrate_joint')))
                throw new AppError('The relevant calibration function was not retrieved.');
            return 'Retrieved the calibration function for a paraphrased query. This smoke test does not benchmark retrieval quality.';
        });
    const serena = new Serena(store.home, project);
    await check('Real Serena function definition', async () => {
        const tools = await serena.list();
        const tool = tools.find(t => t.name === 'find_symbol');
        if (!tool)
            throw new AppError('find_symbol is missing.');
        const schema = object(tool.inputSchema.properties || {});
        const nameKey = 'name_path_pattern' in schema ? 'name_path_pattern' : 'name_path';
        const response = await serena.call('find_symbol', { [nameKey]: 'calibrate_joint', relative_path: 'machine.py', include_body: true });
        if (response.isError || !JSON.stringify(response.content).includes('return value * 2'))
            throw new AppError(`Serena did not retrieve the real function body: ${JSON.stringify(response).slice(0, 1000)}`);
        return 'Retrieved calibrate_joint and its implementation using the installed language server.';
    });
    await check('Real Serena reference lookup', async () => {
        const response = await serena.call('find_referencing_symbols', { name_path: 'calibrate_joint', relative_path: 'machine.py' });
        if (response.isError || !JSON.stringify(response.content).includes('run_machine'))
            throw new AppError(`Serena did not identify run_machine as a reference: ${JSON.stringify(response).slice(0, 1000)}`);
        return 'Identified the calling function run_machine.';
    });
    serena.close();
    report.passed = report.checks.every(c => c.passed);
    writeJson(path.join(store.home, 'verification', 'latest.json'), report);
    writeJson(path.join(dir, 'report.json'), report);
    return report;
}
