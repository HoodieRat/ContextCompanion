import type { Collection, Generation, EmbeddingProfile } from './types.js';
import { Embeddings } from './embeddings.js';
import { type ApiContext } from './api-context.js';
export type GroundedHit = {
    url: string;
    rawUrl?: string;
    filePath?: string;
    originalHash?: string;
    conversion?: 'raw_utf8_fallback';
    apiContext?: ApiContext;
    content: string;
    score: number | null;
};
/** Remove only first-person question scaffolding from upstream ranking.
 * Keep the action, qualifiers and identifiers; support checks use the original
 * request. No extra query/process or alternate retrieval engine is introduced.
 */
export declare function instructionRequest(query: string): string;
export declare function instructionTask(query: string): string | undefined;
export declare function groundedQuery(query: string): string;
/** Do not invent a GitHub-style file viewer URL for an unknown Git host. */
export declare function repositoryFileUrl(repository: string, commit: string, relative: string): string;
export declare function inventoryVersion(input: unknown, library: string, version: string): {
    documentCount: number;
    uniqueUrlCount: number;
    status: string;
};
type StagedFile = {
    path: string;
    stagedPath: string;
    size: number;
    hash: string;
    conversion?: 'raw_utf8_fallback';
};
/** Retry only text omitted by a successful conversion. Grounded still converts and stores it. */
export declare function restageMissingText(root: string, files: StagedFile[], integrity: Record<string, unknown>): string[];
export declare class Grounded {
    readonly home: string;
    readonly embeddings: Embeddings;
    private slot;
    private waiting;
    private slots;
    constructor(home: string, embeddings: Embeddings);
    get entry(): string;
    available(): boolean;
    generationDir(collectionId: string, generationId: string): string;
    options(collection: Collection, generation: Generation, readOnly: boolean, keywordFallback?: boolean): Promise<{
        config: string;
        env: NodeJS.ProcessEnv;
        cwd: string;
    }>;
    inspect(collection: Collection, generation: Generation, signal?: AbortSignal): Promise<Record<string, unknown>>;
    build(collection: Collection, profile: EmbeddingProfile, logFile: string, signal: AbortSignal): Promise<Generation>;
    search(collection: Collection, query: string, limit: number, signal?: AbortSignal, keywordFallback?: boolean, request?: string): Promise<GroundedHit[]>;
    private searchNow;
    similarities(query: string, passages: string[], profile: EmbeddingProfile, signal?: AbortSignal): Promise<number[]>;
}
export {};
