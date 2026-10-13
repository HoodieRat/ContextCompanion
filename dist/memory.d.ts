import { Store } from './state.js';
import type { Memory } from './types.js';
export declare class DevelopmentMemory {
    readonly store: Store;
    constructor(store: Store);
    private stale;
    private testEvidence;
    list(projectId: string, agentOnly?: boolean, history?: boolean): Record<string, unknown>[];
    current(projectId: string): Record<string, unknown>[];
    save(projectId: string, input: unknown, actor?: 'user' | 'agent' | 'system', memoryId?: string): Memory;
}
