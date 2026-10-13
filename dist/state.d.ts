import type { State, Project, Collection, EmbeddingProfile, Metadata } from './types.js';
export declare const LOCAL_PROFILE: EmbeddingProfile;
export declare const DEFAULT_METADATA: Metadata;
export declare function validateState(value: unknown): State;
export declare function readRegistry(file: string): State;
export declare function writeRegistry(file: string, value: State): void;
export declare class Store {
    readonly home: string;
    private state;
    readonly file: string;
    constructor(home: string);
    get data(): State;
    update<T>(fn: (state: State) => T): T;
    project(id: string): Project;
    collection(id: string): Collection;
    attached(projectId: string, agentOnly?: boolean): Collection[];
    requireAttached(projectId: string, collectionId: string, agentOnly?: boolean): Collection;
    recoverJobs(): void;
}
