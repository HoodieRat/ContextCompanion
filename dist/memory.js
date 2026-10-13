import fs from 'node:fs';
import path from 'node:path';
import { checkedFile, looksSecret } from './security.js';
import { AppError, id, text, object, strings, now, hash, readJson, integer } from './util.js';
import { parseDiscoverySources } from './discovery.js';
const KINDS = ['objective', 'constraint', 'architecture', 'decision', 'task', 'attempt', 'test_run', 'blocker', 'handoff', 'discovery', 'solution'];
const STATUSES = ['draft', 'proposed', 'accepted', 'superseded', 'rejected', 'archived'];
export class DevelopmentMemory {
    store;
    constructor(store) {
        this.store = store;
    }
    stale(m) {
        const project = this.store.project(m.projectId);
        const changed = [];
        for (const ref of m.references) {
            try {
                if (hash(fs.readFileSync(checkedFile(project.root, ref.path))) !== ref.hash)
                    changed.push(ref.path);
            }
            catch {
                changed.push(ref.path);
            }
        }
        return changed;
    }
    testEvidence(projectId, ids) {
        if (!ids.length)
            return false;
        return ids.every(testId => {
            try {
                if (!/^[a-zA-Z0-9_-]+$/.test(testId))
                    return false;
                const file = path.join(this.store.home, 'projects', projectId, 'checks', testId + '.json');
                const r = readJson(file);
                const job = this.store.data.jobs.find(j => j.id === testId && j.type === 'checks' && j.targetId === projectId);
                return !!job && job.state === 'succeeded' && r.passed && r.projectId === projectId && r.logFile === job.logFile && hash(fs.readFileSync(r.logFile)) === r.logHash;
            }
            catch {
                return false;
            }
        });
    }
    list(projectId, agentOnly = false, history = false) {
        this.store.project(projectId);
        return this.store.data.memories.filter(m => m.projectId === projectId && (!agentOnly || m.agentAllowed !== false)).map(m => {
            const changed = this.stale(m);
            const tested = m.evidenceLevel === 'tested' && this.testEvidence(projectId, m.testRunIds || []) && !changed.length;
            const { history: revisions, ...value } = m;
            return { ...value, ...(history ? { history: revisions || [] } : {}), stale: !!changed.length, changedReferences: changed, effectiveEvidence: m.evidenceLevel === 'tested' && !tested ? 'unverified' : m.evidenceLevel, verified: tested };
        });
    }
    current(projectId) {
        const priority = { objective: 0, constraint: 1, blocker: 2, handoff: 3, task: 4, decision: 5, architecture: 6, attempt: 7, test_run: 8 };
        return this.list(projectId, true).filter(m => m.status === 'accepted' && m.taskStatus !== 'done').sort((a, b) => (priority[String(a.kind)] ?? 9) - (priority[String(b.kind)] ?? 9) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    }
    save(projectId, input, actor = 'user', memoryId) {
        const project = this.store.project(projectId);
        const body = object(input);
        const old = memoryId ? this.store.data.memories.find(m => m.id === memoryId && m.projectId === projectId) : undefined;
        if (memoryId && !old)
            throw new AppError('Memory not found in this project.', 404);
        if (old && integer(body.expectedRevision, -1, 0, 1000000) !== (old.revision || 1))
            throw new AppError('Memory changed since it was opened. Reload and review the conflict.', 409);
        const kind = body.kind === undefined ? (old?.kind || 'decision') : text(body.kind, 'memory kind', 40);
        if (!KINDS.includes(kind))
            throw new AppError('Unknown memory kind.');
        const status = actor === 'agent' ? 'proposed' : body.status === undefined ? (old?.status || 'accepted') : text(body.status, 'status', 30);
        if (!STATUSES.includes(status))
            throw new AppError('Invalid memory status.');
        const title = body.title === undefined && old ? old.title : text(body.title, 'title', 160);
        const value = body.body === undefined && old ? old.body : text(body.body, 'memory', 8000);
        if (looksSecret(Buffer.from(title + '\n' + value)))
            throw new AppError('Possible credential detected; memory was not saved.');
        const references = body.references === undefined ? (old?.references || []) : strings(body.references, 20, 1000).map(relative => {
            const file = checkedFile(project.root, relative);
            const stat = fs.statSync(file);
            if (!stat.isFile() || stat.size > 1024 * 1024)
                throw new AppError('Memory evidence must be a file below 1 MiB.');
            return { path: relative, hash: hash(fs.readFileSync(file)) };
        });
        const taskStatus = body.taskStatus === undefined ? old?.taskStatus : text(body.taskStatus, 'task status', 30);
        if (taskStatus && !['todo', 'in_progress', 'blocked', 'done'].includes(taskStatus))
            throw new AppError('Invalid task status.');
        const testRunIds = body.testRunIds === undefined ? (old?.testRunIds || []) : strings(body.testRunIds, 20, 100);
        let evidenceLevel = body.evidenceLevel === undefined && old ? old.evidenceLevel : actor === 'user' ? 'user_stated' : 'unverified';
        if (body.evidenceLevel === 'observed' && references.length)
            evidenceLevel = 'observed';
        if (body.evidenceLevel === 'tested') {
            if (!this.testEvidence(projectId, testRunIds))
                throw new AppError('Tested evidence requires a successful recorded check run with its unchanged log.', 422);
            evidenceLevel = 'tested';
        }
        // Agent prose is not proof, but an independently recorded and intact check run is evidence.
        if (actor === 'agent' && evidenceLevel !== 'tested')
            evidenceLevel = 'unverified';
        // Non-code tasks can be completed by the user, but this is user-stated rather than tested.
        if (kind === 'task' && taskStatus === 'done' && actor !== 'user' && status === 'accepted' && !this.testEvidence(projectId, testRunIds))
            throw new AppError('Agent task completion requires successful recorded evidence.', 422);
        if (kind === 'attempt' && body.evidenceLevel === 'tested' && !testRunIds.length)
            throw new AppError('An attempted approach is not a tested solution.');
        const discoverySources = body.discoverySources === undefined ? (old?.discoverySources || []) : parseDiscoverySources(body.discoverySources);
        const validationNotes = body.validationNotes === undefined ? (old?.validationNotes || '') : text(body.validationNotes, 'validation notes', 4000, true);
        const limitations = body.limitations === undefined ? (old?.limitations || '') : text(body.limitations, 'limitations', 2000, true);
        if (looksSecret(Buffer.from(JSON.stringify([discoverySources, validationNotes, limitations]))))
            throw new AppError('Possible credential detected in evidence.');
        const outcome = body.outcome === undefined ? (old?.outcome || 'unknown') : text(body.outcome, 'outcome', 40);
        if (!['unknown', 'successful', 'failed', 'mixed'].includes(outcome))
            throw new AppError('Invalid finding outcome.');
        const dependsOn = body.dependsOn === undefined ? (old?.dependsOn || []) : strings(body.dependsOn, 30, 100);
        const supersedes = body.supersedes === undefined ? old?.supersedes : (body.supersedes ? text(body.supersedes, 'supersedes', 100) : undefined);
        const memory = { id: old?.id || id(), projectId, title, body: value, kind, status: status, evidenceLevel, taskStatus, references,
            createdAt: old?.createdAt || now(), updatedAt: now(), revision: (old?.revision || 0) + 1, actor, agentAllowed: body.agentAllowed === undefined ? (old?.agentAllowed !== false) : body.agentAllowed === true,
            dependsOn, testRunIds, supersedes, discoverySources, validationNotes, limitations, outcome, history: [...(old?.history || []), ...(old ? [{ revision: old.revision || 1, at: now(), actor, value: { ...old, history: undefined } }] : [])] };
        this.store.update(s => {
            if (!old && s.memories.filter(m => m.projectId === projectId).length >= 2000)
                throw new AppError('Archive/export project memory before exceeding 2,000 entries.');
            for (const linked of [...dependsOn, ...(supersedes ? [supersedes] : [])])
                if (linked === memory.id || !s.memories.some(m => m.id === linked && m.projectId === projectId))
                    throw new AppError('Memory links must refer to another item in this project.', 403);
            // Cycle detection across dependency edges, including the proposed replacement.
            const graph = new Map(s.memories.filter(m => m.projectId === projectId).map(m => [m.id, m.dependsOn || []]));
            graph.set(memory.id, dependsOn);
            const visiting = new Set();
            const done = new Set();
            const visit = (key) => {
                if (visiting.has(key))
                    throw new AppError('Task dependency cycle is not allowed.');
                if (done.has(key))
                    return;
                visiting.add(key);
                for (const k of graph.get(key) || [])
                    visit(k);
                visiting.delete(key);
                done.add(key);
            };
            visit(memory.id);
            if (supersedes && status === 'accepted') {
                const target = s.memories.find(m => m.id === supersedes && m.projectId === projectId);
                target.history = [...(target.history || []), { revision: target.revision || 1, at: now(), actor, value: { ...target, history: undefined } }];
                target.status = 'superseded';
                target.revision = (target.revision || 1) + 1;
                target.updatedAt = now();
            }
            if (old)
                s.memories[s.memories.findIndex(m => m.id === old.id)] = memory;
            else
                s.memories.push(memory);
        });
        return memory;
    }
}
//# sourceMappingURL=memory.js.map