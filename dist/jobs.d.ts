import type { Job } from './types.js';
import { Store } from './state.js';
export declare class Jobs {
    readonly store: Store;
    readonly execute: (job: Job, signal: AbortSignal) => Promise<string>;
    readonly finalized?: ((job: Job) => void) | undefined;
    private running?;
    private stopped;
    constructor(store: Store, execute: (job: Job, signal: AbortSignal) => Promise<string>, finalized?: ((job: Job) => void) | undefined);
    enqueue(type: Job['type'], targetId: string): Job;
    pump(): Promise<void>;
    cancel(id: string): void;
    retry(jobId: string): Job;
    settled(): Promise<void>;
    close(): void;
}
