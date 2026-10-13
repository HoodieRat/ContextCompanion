/** The knowledge catalogue is an access boundary, never a solution boundary. */
export declare const DISCOVERY_POLICY = "Stored knowledge is an accelerator, not a constraint or an exhaustive universe of solutions. Use it when helpful, but freely investigate better approaches with the agent's available research, browsing and development tools when evidence is missing, stale, contradictory, or an alternative may improve the result. Compare benefits, costs, compatibility and risks against the actual task; do not redesign functioning components merely because an alternative exists. Validate discoveries against primary sources and appropriate executable checks. Preserve useful discoveries, failures and limitations with provenance using context_record_finding or context_remember. A source not being indexed is not evidence that it is unavailable, invalid or inferior. Source allowlists protect local files and network access; they do not restrict what solutions may be considered. Never broaden permissions, expose secrets, install unapproved packages or change the user's project scope merely to research. If external investigation is unavailable, state that limitation rather than inventing evidence.";
export type DiscoveryEvidence = {
    url: string;
    title: string;
    version: string;
    observedAt: string;
};
export declare function referenceUrl(input: unknown): string;
export declare function parseDiscoverySources(input: unknown): DiscoveryEvidence[];
