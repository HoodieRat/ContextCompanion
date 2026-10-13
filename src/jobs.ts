import fs from 'node:fs';
import path from 'node:path';
import type { Job } from './types.js';
import { Store } from './state.js';
import { id, now, ensureDir, errorText, AppError } from './util.js';
export class Jobs {
    private running?: {
        id: string;
        controller: AbortController;
    };
    private stopped = false;
    constructor(readonly store: Store, readonly execute: (job: Job, signal: AbortSignal) => Promise<string>, readonly finalized?: (job: Job) => void) { store.recoverJobs(); }
    enqueue(type: Job['type'], targetId: string): Job {
        const existing = this.store.data.jobs.find(j => j.type === type && j.targetId === targetId && ['queued', 'running'].includes(j.state));
        if (existing)
            return existing;
        const jobId = id();
        const logFile = path.join(this.store.home, 'logs', 'jobs', `${jobId}.log`);
        ensureDir(path.dirname(logFile));
        const job: Job = { id: jobId, type, targetId, state: 'queued', createdAt: now(), message: 'Queued', logFile };
        this.store.update(s => {
            s.jobs.push(job);
            if (s.jobs.length > 250)
                s.jobs = s.jobs.filter(j => ['queued', 'running'].includes(j.state)).concat(s.jobs.filter(j => !['queued', 'running'].includes(j.state)).slice(-200));
        });
        setImmediate(() => void this.pump());
        return job;
    }
    async pump(): Promise<void> {
        if (this.running || this.stopped)
            return;
        const next = this.store.data.jobs.find(j => j.state === 'queued');
        if (!next)
            return;
        const controller = new AbortController();
        this.running = { id: next.id, controller };
        this.store.update(s => { const j = s.jobs.find(j => j.id === next.id)!; j.state = 'running'; j.startedAt = now(); j.message = 'Running'; });
        fs.appendFileSync(next.logFile, `Context Companion ${next.type} job started ${now()}\n`);
        try {
            const message = await this.execute(next, controller.signal);
            this.store.update(s => { const j = s.jobs.find(j => j.id === next.id)!; j.state = controller.signal.aborted ? 'cancelled' : 'succeeded'; j.message = controller.signal.aborted ? 'Cancelled' : message; j.endedAt = now(); });
            fs.appendFileSync(next.logFile, `${message}\n`);
        }
        catch (error) {
            const message = errorText(error);
            this.store.update(s => { const j = s.jobs.find(j => j.id === next.id)!; j.state = controller.signal.aborted ? 'cancelled' : 'failed'; j.message = message; j.endedAt = now(); });
            fs.appendFileSync(next.logFile, `FAILED: ${message}\n`);
        }
        finally {
            try {
                const completed = this.store.data.jobs.find(j => j.id === next.id);
                if (completed)
                    this.finalized?.(completed);
            }
            catch (error) {
                fs.appendFileSync(next.logFile, `Evidence finalization failed: ${errorText(error)}\n`);
            }
            finally {
                this.running = undefined;
                setImmediate(() => void this.pump());
            }
        }
    }
    cancel(id: string): void {
        const job = this.store.data.jobs.find(j => j.id === id);
        if (!job)
            throw new AppError('Job not found.', 404);
        if (this.running?.id === id)
            this.running.controller.abort();
        else if (job.state === 'queued')
            this.store.update(s => { const j = s.jobs.find(j => j.id === id)!; j.state = 'cancelled'; j.endedAt = now(); j.message = 'Cancelled before starting.'; });
    }
    retry(jobId: string): Job { const old = this.store.data.jobs.find(j => j.id === jobId); if (!old || ['queued', 'running'].includes(old.state))
        throw new AppError('Only a completed or interrupted job can be retried.'); const next = this.enqueue(old.type, old.targetId); this.store.update(s => { s.jobs.find(j => j.id === next.id)!.retryOf = jobId; }); return { ...next, retryOf: jobId }; }
    async settled(): Promise<void> { for (let i = 0; this.running && i < 300; i++)
        await new Promise(resolve => setTimeout(resolve, 50)); if (this.running)
        throw new AppError('A job has not stopped yet. Do not restore or restart while it is active.'); }
    close(): void { this.stopped = true; this.running?.controller.abort(); }
}
