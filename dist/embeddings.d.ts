import type { EmbeddingProfile } from './types.js';
export type Connection = {
    baseUrl: string;
    token: string;
    model: string;
    dimensions: number;
};
export declare const profileId: (profile: EmbeddingProfile) => string;
export declare class Embeddings {
    readonly home: string;
    private workers;
    constructor(home: string);
    connection(profile: EmbeddingProfile, interactive?: boolean): Promise<Connection | undefined>;
    probe(profile: EmbeddingProfile, timeoutMs?: number): Promise<Record<string, unknown>>;
    status(): Promise<Record<string, unknown>[]>;
    /** Compare returned passages only; no ingestion, vector store or confidence gate. */
    similarities(query: string, passages: string[], profile: EmbeddingProfile, signal?: AbortSignal): Promise<number[]>;
    close(): void;
}
