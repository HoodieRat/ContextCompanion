export type EmbeddingProfile = {
    kind: 'local' | 'external' | 'off';
    model: string;
    dimensions: number;
    revision: string;
    baseUrl: string;
    offline?: boolean;
};
export type Source = {
    kind: 'url';
    url: string;
} | {
    kind: 'git';
    url: string;
    ref: string;
} | {
    kind: 'local';
    path: string;
} | {
    kind: 'managed';
    path: string;
};
export type Metadata = {
    library: string;
    ecosystem: string;
    languages: string[];
    platforms: string[];
    apiFamily: string;
    versionRange: string;
    kind: 'api' | 'guide' | 'example' | 'project_context';
    reliability: 'official' | 'maintainer' | 'community' | 'user' | 'unknown';
    reliabilityEvidence: string;
    license: string;
};
export type Dependency = {
    name: string;
    ecosystem: string;
    constraint: string;
    resolved?: string;
    evidence: string;
    confidence: 'declared' | 'locked' | 'manual' | 'unresolved';
    workspace: string;
};
export type Profile = {
    languages: string[];
    platforms: string[];
    dependencies: Dependency[];
    apiFamily: string;
};
export type Provenance = {
    sourceUrl: string;
    filePath?: string;
    repository?: string;
    commit?: string;
    contentHash?: string;
    originalHash?: string;
    conversion?: 'raw_utf8_fallback';
    observedAt: string;
    pipeline: string;
};
export type Generation = {
    id: string;
    createdAt: string;
    profile: EmbeddingProfile;
    sourceFingerprint: string;
    files: number;
    skipped: number;
    snapshotRoot?: string;
    originalRoot?: string;
    lastGood: boolean;
    commit?: string;
    integrity?: Record<string, unknown>;
    coverage?: 'complete' | 'partial' | 'unknown';
    upstreamVersion?: string;
    sourceRevision?: number;
};
export type Collection = {
    id: string;
    name: string;
    version: string;
    tags: string[];
    ownerProjectId: string | null;
    source: Source;
    maxPages: number;
    maxDepth: number;
    refreshHours: number;
    exclusions: string[];
    scrapeMode: 'fetch' | 'playwright';
    active?: Generation;
    previous?: Generation;
    lastAttempt?: string;
    lastError?: string;
    lastRefresh?: string;
    createdAt: string;
    metadata?: Metadata;
    agentAllowed?: boolean;
    enabled?: boolean;
    revision?: number;
    needsRefresh?: boolean;
    allowPartial?: boolean;
};
export type Check = {
    name: string;
    command: string;
    args: string[];
    timeoutSeconds: number;
};
export type Project = {
    id: string;
    name: string;
    root: string;
    collections: string[];
    budget: number;
    maxSources: number;
    hooks: boolean;
    linked: boolean;
    checks: Check[];
    createdAt: string;
    profile?: Profile;
    profileManual?: boolean;
};
export type MemoryKind = 'objective' | 'constraint' | 'architecture' | 'decision' | 'task' | 'attempt' | 'test_run' | 'blocker' | 'handoff' | 'discovery' | 'solution';
export type Memory = {
    id: string;
    projectId: string;
    title: string;
    body: string;
    createdAt: string;
    references: {
        path: string;
        hash: string;
    }[];
    kind?: MemoryKind;
    status?: 'draft' | 'proposed' | 'accepted' | 'superseded' | 'rejected' | 'archived';
    taskStatus?: 'todo' | 'in_progress' | 'blocked' | 'done';
    evidenceLevel?: 'user_stated' | 'observed' | 'tested' | 'unverified';
    revision?: number;
    actor?: 'user' | 'agent' | 'system';
    updatedAt?: string;
    agentAllowed?: boolean;
    supersedes?: string;
    dependsOn?: string[];
    testRunIds?: string[];
    discoverySources?: {
        url: string;
        title: string;
        version: string;
        observedAt: string;
    }[];
    validationNotes?: string;
    limitations?: string;
    outcome?: 'unknown' | 'successful' | 'failed' | 'mixed';
    history?: {
        revision: number;
        at: string;
        actor: string;
        value: Record<string, unknown>;
    }[];
};
export type Job = {
    id: string;
    type: 'index' | 'checks' | 'verify';
    targetId: string;
    state: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
    createdAt: string;
    startedAt?: string;
    endedAt?: string;
    message: string;
    logFile: string;
    retryOf?: string;
};
export type State = {
    schemaVersion: 2;
    revision: number;
    settings: {
        embedding: EmbeddingProfile;
    };
    projects: Project[];
    collections: Collection[];
    memories: Memory[];
    jobs: Job[];
};
export type SearchFilters = {
    library?: string;
    version?: string;
    language?: string;
    platform?: string;
    apiFamily?: string;
    kinds?: string[];
    includeUnverified?: boolean;
};
export type Compatibility = {
    status: 'exact' | 'declared_range' | 'unversioned' | 'unknown' | 'mismatch';
    reasons: string[];
};
export type SearchHit = {
    apiContext?: import('./api-context.js').ApiContext;
    duplicateOf?: string;
    id: string;
    collectionId: string;
    collection: string;
    version: string;
    url: string;
    content: string;
    score: number;
    indexedAt: string;
    rank: number;
    provenance?: Provenance;
    compatibility?: Compatibility;
    metadata?: Metadata;
    exactMatch?: boolean;
    scoreReasons?: string[];
    excerptComplete?: boolean;
    /** UTF-16 offset in the retrieved passage; context_read may expose a full source_text instead. */
    excerptOffset?: number;
    originalCharacters?: number;
    securityWarnings?: string[];
};
export type SearchResult = {
    projectId: string;
    hits: SearchHit[];
    warnings: string[];
    selected: {
        id: string;
        name: string;
        reason: string;
    }[];
    omittedSources: number;
    estimatedTokens: number;
    packet: string;
    snapshotSetId?: string;
    status?: 'ok' | 'no_results';
    budgetUnit?: 'utf8_bytes';
    serializedBytes?: number;
};
export type RuntimeRecord = {
    pid: number;
    port: number;
    token: string;
    startedAt: string;
    appRoot: string;
};
export type JsonObject = Record<string, unknown>;
export type Installation = {
    appRoot: string;
    node: string;
    python?: string;
    installedAt: string;
    modelRevision?: string;
};
