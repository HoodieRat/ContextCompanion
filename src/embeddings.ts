import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createInterface } from 'node:readline';
import type { EmbeddingProfile } from './types.js';
import { APP_ROOT, AppError, ensureDir, hash, object, errorText, withTimeout } from './util.js';
import { spawnOwned, cleanEnvironment, stopChild } from './process.js';
import { localEndpoint } from './security.js';
import type { ChildProcess } from 'node:child_process';
export type Connection = {
    baseUrl: string;
    token: string;
    model: string;
    dimensions: number;
};
export const profileId = (profile: EmbeddingProfile): string => hash(JSON.stringify(profile)).slice(0, 20);
export class Embeddings {
    private workers = new Map<string, {
        child: ChildProcess;
        connection: Promise<Connection>;
    }>();
    constructor(readonly home: string) { }
    async connection(profile: EmbeddingProfile, interactive = false): Promise<Connection | undefined> {
        if (profile.kind === 'off')
            return undefined;
        if (profile.kind === 'external')
            return { baseUrl: localEndpoint(profile.baseUrl), token: 'local', model: profile.model, dimensions: profile.dimensions };
        if (!/^[a-f0-9]{40}$/.test(profile.revision))
            throw new AppError('The local embedding model has not been pinned by the installer. Run Install.bat, or select Keyword only in Settings.', 503);
        const key = profileId(profile);
        const routed = (connection: Connection): Connection => interactive ? { ...connection, baseUrl: connection.baseUrl.replace(/\/v1$/, '/query/v1') } : connection;
        const existing = this.workers.get(key);
        if (existing)
            return existing.connection.then(routed);
        if (this.workers.size >= 2)
            throw new AppError('Two local model revisions are already active. Restart Context Companion before using another.', 503);
        const token = crypto.randomBytes(32).toString('hex');
        const cwd = path.join(this.home, 'runtime', 'worker');
        ensureDir(cwd);
        const child = spawnOwned(process.execPath, [path.join(APP_ROOT, 'dist', 'embedding-worker.js'), '--home', this.home, '--model', profile.model, '--revision', profile.revision], { cwd, env: cleanEnvironment({ CC_EMBED_TOKEN: token, CC_EMBED_OFFLINE: profile.offline ? '1' : '0' }) });
        const log = path.join(this.home, 'logs', 'embeddings.log');
        ensureDir(path.dirname(log));
        child.stderr?.on('data', (chunk: Buffer) => fs.appendFileSync(log, chunk));
        const connection = withTimeout(new Promise<Connection>((resolve, reject) => {
            const lines = createInterface({ input: child.stdout! });
            lines.on('line', line => {
                try {
                    const msg = object(JSON.parse(line));
                    if (typeof msg.port === 'number') {
                        resolve({ baseUrl: `http://127.0.0.1:${msg.port}/v1`, token, model: profile.model, dimensions: profile.dimensions });
                        lines.close();
                    }
                }
                catch { /* Non-protocol output is ignored; failures surface through exit/logs. */ }
            });
            child.once('error', reject);
            child.once('exit', code => { this.workers.delete(key); reject(new AppError(`Embedding worker exited (${code}). Read logs/embeddings.log.`, 503)); });
        }), 15000, 'Embedding worker failed to start. See logs/embeddings.log.').catch(error => { stopChild(child); this.workers.delete(key); throw error; });
        this.workers.set(key, { child, connection });
        return connection.then(routed);
    }
    async probe(profile: EmbeddingProfile, timeoutMs = 240000): Promise<Record<string, unknown>> {
        const connection = await this.connection(profile);
        if (!connection)
            return { kind: 'off', ready: true, semantic: false, message: 'Keyword-only search selected.' };
        const response = await fetch(`${connection.baseUrl}/embeddings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.token}` }, body: JSON.stringify({ model: connection.model, input: ['A small blue robot.', 'An orange on a tree.'] }), signal: AbortSignal.timeout(timeoutMs) });
        if (!response.ok)
            throw new AppError(`Embedding probe failed (${response.status}): ${(await response.text()).slice(0, 1000)}`, 503);
        const body = object(await response.json());
        if (body.model !== connection.model)
            throw new AppError('Embedding response model does not match the configured model.', 502);
        if (!Array.isArray(body.data) || body.data.length !== 2)
            throw new AppError('Embedding response did not return two vectors.', 502);
        for (const item of body.data) {
            const vector = object(item).embedding;
            if (!Array.isArray(vector) || vector.length !== connection.dimensions || vector.some(n => typeof n !== 'number' || !Number.isFinite(n)))
                throw new AppError('Embedding response dimension or numeric validation failed.', 502);
        }
        return { kind: profile.kind, ready: true, semantic: true, model: connection.model, dimensions: connection.dimensions, revision: profile.revision };
    }
    async status(): Promise<Record<string, unknown>[]> {
        return Promise.all([...this.workers.values()].map(async (worker) => {
            try {
                const c = await worker.connection;
                return object(await (await fetch(c.baseUrl.replace(/\/v1$/, '/health'), { headers: { Authorization: `Bearer ${c.token}` }, signal: AbortSignal.timeout(2000) })).json());
            }
            catch (error) {
                return { state: 'error', error: errorText(error) };
            }
        }));
    }
    /** Compare returned passages only; no ingestion, vector store or confidence gate. */
    async similarities(query: string, passages: string[], profile: EmbeddingProfile, signal?: AbortSignal): Promise<number[]> {
        if (profile.kind !== 'local') throw new AppError('Cross-source comparison requires the local embedding worker.', 503);
        const connection = await this.connection(profile, true);
        if (!connection) throw new AppError('Local embedding worker unavailable.', 503);
        const embed = async (input: string[]): Promise<number[][]> => {
            const response = await fetch(`${connection.baseUrl}/embeddings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.token}` }, body: JSON.stringify({ model: connection.model, input }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
            if (!response.ok) throw new AppError(`Embedding comparison failed (${response.status}).`, 503);
            const body = object(await response.json());
            if (body.model !== connection.model || !Array.isArray(body.data) || body.data.length !== input.length) throw new AppError('Embedding comparison identity/count mismatch.', 502);
            return body.data.map(item => {
                const vector = object(item).embedding;
                if (!Array.isArray(vector) || vector.length !== connection.dimensions || vector.some(n => typeof n !== 'number' || !Number.isFinite(n))) throw new AppError('Embedding comparison vector is invalid.', 502);
                return vector as number[];
            });
        };
        const [q] = await embed([query]);
        const queryNorm = Math.sqrt(q!.reduce((n, v) => n + v * v, 0));
        if (!queryNorm) throw new AppError('Embedding comparison returned a zero query vector.', 502);
        const scores: number[] = [];
        for (let start = 0; start < passages.length; start += 32) {
            const vectors = await embed(passages.slice(start, start + 32));
            for (const vector of vectors) {
                const norm = Math.sqrt(vector.reduce((n, v) => n + v * v, 0));
                scores.push(norm ? Math.max(-1, Math.min(1, vector.reduce((n, v, i) => n + v * q![i]!, 0) / (norm * queryNorm))) : 0);
            }
        }
        return scores;
    }
    close(): void { for (const worker of this.workers.values())
        stopChild(worker.child); this.workers.clear(); }
}
