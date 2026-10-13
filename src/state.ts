import fs from 'node:fs';
import path from 'node:path';
import type { State, Project, Collection, EmbeddingProfile, Installation, Metadata } from './types.js';
import { AppError, ensureDir, readJson, writeJson, now, requireId, hash, object } from './util.js';
export const LOCAL_PROFILE: EmbeddingProfile = {
    kind: 'local', model: 'Xenova/all-MiniLM-L6-v2', dimensions: 384, revision: '', baseUrl: '', offline: false
};
export const DEFAULT_METADATA: Metadata = {
    library: '', ecosystem: 'generic', languages: [], platforms: [], apiFamily: '', versionRange: '', kind: 'guide',
    reliability: 'unknown', reliabilityEvidence: '', license: 'unknown'
};
export function validateState(value: unknown): State {
    const v = object(value, 'registry');
    if (v.schemaVersion !== 2 || !Number.isSafeInteger(v.revision))
        throw new AppError('Unsupported registry schema or revision.', 500);
    for (const key of ['projects', 'collections', 'memories', 'jobs'])
        if (!Array.isArray(v[key]))
            throw new AppError(`Invalid registry ${key}.`, 500);
    if (!object(v.settings).embedding)
        throw new AppError('Missing embedding settings.', 500);
    const s = v as unknown as State;
    for (const records of [s.projects, s.collections, s.memories, s.jobs]) {
        const ids = new Set<string>();
        for (const record of records) {
            requireId(record.id);
            if (ids.has(record.id))
                throw new AppError('Duplicate registry identifier.', 500);
            ids.add(record.id);
        }
    }
    for (const project of s.projects) {
        if (!path.isAbsolute(project.root) || !Array.isArray(project.collections) || !Number.isSafeInteger(project.budget) || project.budget < 500 || project.budget > 8000)
            throw new AppError('Invalid project configuration.', 500);
        for (const id of project.collections) {
            const c = s.collections.find(c => c.id === id);
            if (!c || c.ownerProjectId !== null && c.ownerProjectId !== project.id)
                throw new AppError('Invalid or cross-project source attachment.', 500);
        }
    }
    for (const c of s.collections) {
        if (!['local', 'managed', 'url', 'git'].includes(c.source.kind) || !c.name || typeof c.version !== 'string')
            throw new AppError('Invalid source record.', 500);
        if (c.active)
            requireId(c.active.id);
        if (c.previous)
            requireId(c.previous.id);
    }
    return s;
}
export function readRegistry(file: string): State {
    const raw = readJson<Record<string, unknown>>(file);
    const checksum = raw.checksum;
    delete raw.checksum;
    if (checksum !== undefined && checksum !== hash(JSON.stringify(raw)))
        throw new AppError('Registry checksum mismatch. Restore a verified backup; no reset was performed.', 500);
    if (raw.schemaVersion === 1) {
        raw.schemaVersion = 2;
        for (const c of raw.collections as Collection[]) {
            c.metadata = { ...DEFAULT_METADATA };
            c.agentAllowed = true;
            c.enabled = true;
            c.revision = 1;
        }
        for (const m of raw.memories as State['memories']) {
            m.kind = 'decision';
            m.status = 'proposed';
            m.evidenceLevel = 'unverified';
            m.revision = 1;
            m.actor = 'user';
            m.agentAllowed = true;
            m.updatedAt = m.createdAt;
            m.history = [];
        }
    }
    else if (checksum === undefined)
        throw new AppError('Registry checksum is absent. Refusing an unverified registry.', 500);
    return validateState(raw);
}
export function writeRegistry(file: string, value: State): void {
    validateState(value);
    writeJson(file, { ...value, checksum: hash(JSON.stringify(value)) });
}
export class Store {
    private state: State;
    readonly file: string;
    constructor(readonly home: string) {
        ensureDir(home);
        if (fs.existsSync(path.join(home, 'restore-pending.json')))
            throw new AppError('A restore was interrupted. Run Restore-Backup.bat with the same backup ID before starting.', 503);
        this.file = path.join(home, 'state.json');
        if (fs.existsSync(this.file)) {
            this.state = readRegistry(this.file);
            if (readJson<{
                schemaVersion: number;
            }>(this.file).schemaVersion === 1) {
                fs.copyFileSync(this.file, path.join(home, 'state.pre-v2.json'));
                writeRegistry(this.file, this.state);
            }
        }
        else {
            let revision = '';
            try {
                revision = readJson<Installation>(path.join(home, 'installation.json')).modelRevision || '';
            }
            catch { /*Not installed.*/ }
            this.state = { schemaVersion: 2, revision: 0, settings: { embedding: { ...LOCAL_PROFILE, revision } }, projects: [], collections: [], memories: [], jobs: [] };
            writeRegistry(this.file, this.state);
        }
    }
    get data(): State { return structuredClone(this.state); }
    update<T>(fn: (state: State) => T): T {
        const onDisk = readRegistry(this.file);
        if (onDisk.revision !== this.state.revision)
            throw new AppError('Registry changed in another process. Restart the controller before retrying.', 409);
        const next = structuredClone(this.state);
        const result = fn(next);
        next.revision++;
        validateState(next);
        writeRegistry(path.join(this.home, 'state.previous.json'), this.state);
        writeRegistry(this.file, next);
        this.state = next;
        return structuredClone(result);
    }
    project(id: string): Project { requireId(id); const value = this.state.projects.find(p => p.id === id); if (!value)
        throw new AppError('Project not found.', 404); return structuredClone(value); }
    collection(id: string): Collection { requireId(id); const value = this.state.collections.find(c => c.id === id); if (!value)
        throw new AppError('Knowledge source not found.', 404); return structuredClone(value); }
    attached(projectId: string, agentOnly = false): Collection[] {
        const project = this.project(projectId);
        return this.state.collections.filter(c => project.collections.includes(c.id) && (c.ownerProjectId === null || c.ownerProjectId === projectId) && (!agentOnly || (c.enabled !== false && c.agentAllowed !== false))).map(c => structuredClone(c));
    }
    requireAttached(projectId: string, collectionId: string, agentOnly = true): Collection {
        const collection = this.attached(projectId, agentOnly).find(c => c.id === collectionId);
        if (!collection)
            throw new AppError('This knowledge source is not available to this project/agent.', 403);
        return collection;
    }
    recoverJobs(): void {
        if (!this.state.jobs.some(j => j.state === 'running'))
            return;
        this.update(state => {
            for (const job of state.jobs)
                if (job.state === 'running') {
                    job.state = 'interrupted';
                    job.endedAt = now();
                    job.message = 'Interrupted by shutdown. Last published index retained. Retry resumes by safely rebuilding unpublished work.';
                }
        });
    }
}
