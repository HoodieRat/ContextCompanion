import type { Collection, Project, SearchHit, SearchResult, SearchFilters } from './types.js';
import { Store } from './state.js';
import type { Grounded } from './grounded.js';
export declare function words(value: string): string[];
export declare function identifierVariants(query: string): string[];
export declare function exactIdentifier(query: string, content: string): boolean;
export declare function selectSources(collections: Collection[], query: string, project: Project, requested?: string[]): {
    collection: Collection;
    reason: string;
}[];
export declare function securityWarnings(content: string): string[];
export declare function sensitiveLookup(query: string): boolean;
export declare function packEvidence(hits: SearchHit[], budget: number, extras?: Record<string, unknown>): {
    hits: SearchHit[];
    packet: string;
    estimatedTokens: number;
    serializedBytes: number;
};
export declare class Retrieval {
    readonly store: Store;
    readonly grounded: Pick<Grounded, 'search'> & Partial<Pick<Grounded, 'similarities'>>;
    private cache;
    private hits;
    private seen;
    activeReaders: number;
    constructor(store: Store, grounded: Pick<Grounded, 'search'> & Partial<Pick<Grounded, 'similarities'>>);
    private policy;
    search(projectId: string, query: string, options?: {
        sourceIds?: string[];
        budget?: number;
        signal?: AbortSignal;
        session?: string;
        reset?: boolean;
        filters?: SearchFilters;
        mode?: 'auto' | 'lexical';
        sourceLimit?: number;
        expandIdentifiers?: boolean;
    }): Promise<SearchResult>;
    private perform;
    read(projectId: string, hitId: string, offset: number, length: number): Record<string, unknown>;
    resetSession(projectId: string, session: string): void;
    summary(projectId: string): Record<string, unknown>;
}
