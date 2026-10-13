import type { RuntimeRecord } from './types.js';
export declare function api(record: RuntimeRecord, endpoint: string, method?: string, body?: unknown, timeoutMs?: number, signal?: AbortSignal): Promise<unknown>;
export declare function findDaemon(home: string): Promise<RuntimeRecord | undefined>;
export declare function ensureDaemon(home: string, timeoutMs?: number): Promise<RuntimeRecord>;
