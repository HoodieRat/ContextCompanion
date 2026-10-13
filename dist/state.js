import fs from 'node:fs';
import path from 'node:path';
import { AppError, ensureDir, readJson, writeJson, now, requireId, hash, object } from './util.js';
export const LOCAL_PROFILE = {
    kind: 'local', model: 'Xenova/all-MiniLM-L6-v2', dimensions: 384, revision: '', baseUrl: '', offline: false
};
export const DEFAULT_METADATA = {
    library: '', ecosystem: 'generic', languages: [], platforms: [], apiFamily: '', versionRange: '', kind: 'guide',
    reliability: 'unknown', reliabilityEvidence: '', license: 'unknown'
};
export function validateState(value) {
    const v = object(value, 'registry');
    if (v.schemaVersion !== 2 || !Number.isSafeInteger(v.revision))
        throw new AppError('Unsupported registry schema or revision.', 500);
    for (const key of ['projects', 'collections', 'memories', 'jobs'])
        if (!Array.isArray(v[key]))
            throw new AppError(`Invalid registry ${key}.`, 500);
    if (!object(v.settings).embedding)
        throw new AppError('Missing embedding settings.', 500);
    const s = v;
    for (const records of [s.projects, s.collections, s.memories, s.jobs]) {
        const ids = new Set();
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
export function readRegistry(file) {
    const raw = readJson(file);
    const checksum = raw.checksum;
    delete raw.checksum;
    if (checksum !== undefined && checksum !== hash(JSON.stringify(raw)))
        throw new AppError('Registry checksum mismatch. Restore a verified backup; no reset was performed.', 500);
    if (raw.schemaVersion === 1) {
        raw.schemaVersion = 2;
        for (const c of raw.collections) {
            c.metadata = { ...DEFAULT_METADATA };
            c.agentAllowed = true;
            c.enabled = true;
            c.revision = 1;
        }
        for (const m of raw.memories) {
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
export function writeRegistry(file, value) {
    validateState(value);
    writeJson(file, { ...value, checksum: hash(JSON.stringify(value)) });
}
export class Store {
    home;
    state;
    file;
    constructor(home) {
        this.home = home;
        ensureDir(home);
        if (fs.existsSync(path.join(home, 'restore-pending.json')))
            throw new AppError('A restore was interrupted. Run Restore-Backup.bat with the same backup ID before starting.', 503);
        this.file = path.join(home, 'state.json');
        if (fs.existsSync(this.file)) {
            this.state = readRegistry(this.file);
            if (readJson(this.file).schemaVersion === 1) {
                fs.copyFileSync(this.file, path.join(home, 'state.pre-v2.json'));
                writeRegistry(this.file, this.state);
            }
        }
        else {
            let revision = '';
            try {
                revision = readJson(path.join(home, 'installation.json')).modelRevision || '';
            }
            catch { /*Not installed.*/ }
            this.state = { schemaVersion: 2, revision: 0, settings: { embedding: { ...LOCAL_PROFILE, revision } }, projects: [], collections: [], memories: [], jobs: [] };
            writeRegistry(this.file, this.state);
        }
    }
    get data() { return structuredClone(this.state); }
    update(fn) {
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
    project(id) {
        requireId(id);
        const value = this.state.projects.find(p => p.id === id);
        if (!value)
            throw new AppError('Project not found.', 404);
        return structuredClone(value);
    }
    collection(id) {
        requireId(id);
        const value = this.state.collections.find(c => c.id === id);
        if (!value)
            throw new AppError('Knowledge source not found.', 404);
        return structuredClone(value);
    }
    attached(projectId, agentOnly = false) {
        const project = this.project(projectId);
        return this.state.collections.filter(c => project.collections.includes(c.id) && (c.ownerProjectId === null || c.ownerProjectId === projectId) && (!agentOnly || (c.enabled !== false && c.agentAllowed !== false))).map(c => structuredClone(c));
    }
    requireAttached(projectId, collectionId, agentOnly = true) {
        const collection = this.attached(projectId, agentOnly).find(c => c.id === collectionId);
        if (!collection)
            throw new AppError('This knowledge source is not available to this project/agent.', 403);
        return collection;
    }
    recoverJobs() {
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
//# sourceMappingURL=state.js.map