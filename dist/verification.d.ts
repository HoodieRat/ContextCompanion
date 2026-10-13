import { Store } from './state.js';
import { Grounded } from './grounded.js';
import { Embeddings } from './embeddings.js';
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
export declare function verify(store: Store, grounded: Grounded, embeddings: Embeddings, logFile: string, signal: AbortSignal): Promise<Verification>;
