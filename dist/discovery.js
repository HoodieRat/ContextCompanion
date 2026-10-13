import { AppError, object, text } from './util.js';
/** The knowledge catalogue is an access boundary, never a solution boundary. */
export const DISCOVERY_POLICY = `Stored knowledge is an accelerator, not a constraint or an exhaustive universe of solutions. Use it when helpful, but freely investigate better approaches with the agent's available research, browsing and development tools when evidence is missing, stale, contradictory, or an alternative may improve the result. Compare benefits, costs, compatibility and risks against the actual task; do not redesign functioning components merely because an alternative exists. Validate discoveries against primary sources and appropriate executable checks. Preserve useful discoveries, failures and limitations with provenance using context_record_finding or context_remember. A source not being indexed is not evidence that it is unavailable, invalid or inferior. Source allowlists protect local files and network access; they do not restrict what solutions may be considered. Never broaden permissions, expose secrets, install unapproved packages or change the user's project scope merely to research. If external investigation is unavailable, state that limitation rather than inventing evidence.`;
export function referenceUrl(input) {
    const value = text(input, 'source URL', 2000);
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new AppError('Discovery references require a valid HTTP(S) URL.');
    }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
        throw new AppError('Discovery URLs must be HTTP(S) without embedded credentials.');
    for (const key of url.searchParams.keys())
        if (/token|secret|password|signature|api.?key|credential/i.test(key))
            throw new AppError('Do not preserve credential-bearing URLs.');
    return url.href;
}
export function parseDiscoverySources(input) {
    if (input === undefined)
        return [];
    if (!Array.isArray(input) || input.length > 20)
        throw new AppError('Supply up to 20 discovery source references.');
    return input.map(value => {
        const v = typeof value === 'string' ? { url: value } : object(value);
        const observedAt = v.observedAt === undefined ? new Date().toISOString() : text(v.observedAt, 'observedAt', 100);
        if (!Number.isFinite(Date.parse(observedAt)))
            throw new AppError('Source observation time must be a valid timestamp.');
        return { url: referenceUrl(v.url), title: v.title === undefined ? '' : text(v.title, 'source title', 200, true), version: v.version === undefined ? 'unverified' : text(v.version, 'source version', 100), observedAt };
    });
}
//# sourceMappingURL=discovery.js.map