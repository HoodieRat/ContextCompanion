import { createRequire } from 'node:module';
import path from 'node:path';
import { APP_ROOT, AppError, object, strings, text } from './util.js';
import { DEFAULT_METADATA } from './state.js';
import type { Collection, Compatibility, Metadata, Profile, SearchFilters } from './types.js';
const require = createRequire(import.meta.url);
const semver = require(path.join(APP_ROOT, 'vendor', 'semver')) as {
    valid: (v: string) => string | null;
    validRange: (v: string) => string | null;
    satisfies: (v: string, r: string, o?: object) => boolean;
};
export function language(value: string): string {
    const v = value.toLowerCase().trim();
    return ({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', pyi: 'python', cs: 'csharp', 'c#': 'csharp', rs: 'rust', cxx: 'cpp', 'c++': 'cpp', ps1: 'powershell' } as Record<string, string>)[v] || v;
}
export function platform(value: string): string { const v = value.toLowerCase().trim(); return ({ win32: 'windows', win: 'windows', darwin: 'macos', osx: 'macos' } as Record<string, string>)[v] || v; }
export function parseMetadata(input: unknown, current = DEFAULT_METADATA): Metadata {
    const v = object(input);
    const next = { ...current };
    for (const key of ['library', 'ecosystem', 'apiFamily', 'versionRange', 'reliabilityEvidence', 'license'] as const)
        if (v[key] !== undefined)
            next[key] = text(v[key], key, 1000, true);
    if (v.languages !== undefined)
        next.languages = strings(v.languages, 30, 80).map(language);
    if (v.platforms !== undefined)
        next.platforms = strings(v.platforms, 20, 80).map(platform);
    if (v.kind !== undefined) {
        if (!['api', 'guide', 'example', 'project_context'].includes(String(v.kind)))
            throw new AppError('Invalid content kind.');
        next.kind = v.kind as Metadata['kind'];
    }
    if (v.reliability !== undefined) {
        if (!['official', 'maintainer', 'community', 'user', 'unknown'].includes(String(v.reliability)))
            throw new AppError('Invalid source reliability.');
        next.reliability = v.reliability as Metadata['reliability'];
    }
    return next;
}
export function parseFilters(input: unknown): SearchFilters {
    const v = object(input);
    const allowed = new Set(['library', 'version', 'language', 'platform', 'apiFamily', 'kinds', 'includeUnverified']);
    for (const key of Object.keys(v))
        if (!allowed.has(key))
            throw new AppError(`Unknown retrieval filter: ${key}`);
    const f: SearchFilters = {};
    for (const key of ['library', 'version', 'language', 'platform', 'apiFamily'] as const)
        if (v[key] !== undefined)
            f[key] = text(v[key], key, 160);
    if (v.kinds !== undefined)
        f.kinds = strings(v.kinds, 10, 30);
    if (v.includeUnverified !== undefined) {
        if (typeof v.includeUnverified !== 'boolean')
            throw new AppError('includeUnverified must be boolean.');
        f.includeUnverified = v.includeUnverified;
    }
    return f;
}
// Opaque labels and non-npm ecosystems use exact comparison, never npm semantics by accident.
export function versionCompatibility(requested: string, stored: string, range: string, ecosystem: string): Compatibility {
    if (requested === stored)
        return { status: 'exact', reasons: [`Exact version label ${stored}`] };
    if (range && ecosystem === 'npm' && semver.valid(requested) && semver.validRange(range))
        return semver.satisfies(requested, range, { includePrerelease: false }) ?
            { status: 'declared_range', reasons: [`Source declares npm compatibility ${range}; not independent runtime proof`] } :
            { status: 'mismatch', reasons: [`${requested} does not satisfy source range ${range}`] };
    return { status: 'mismatch', reasons: [`Requested ${requested}; source declares ${stored || 'unknown'}. No version fallback used.`] };
}
export function applicability(c: Collection, profile: Profile | undefined, filters: SearchFilters = {}): Compatibility {
    const m = c.metadata || DEFAULT_METADATA;
    const reasons: string[] = [];
    const mismatch = (reason: string): Compatibility => ({ status: 'mismatch', reasons: [reason] });
    const unknown = (reason: string): Compatibility => ({ status: 'unknown', reasons: [reason] });
    if (c.enabled === false || c.agentAllowed === false || c.needsRefresh === true)
        return mismatch('Source disabled, local-only, or awaiting a policy refresh');
    if (filters.kinds?.length && !filters.kinds.includes(m.kind))
        return mismatch('Content kind excluded');
    if (filters.library && m.library.toLowerCase() !== filters.library.toLowerCase())
        return mismatch('Different library');
    const langs = filters.language ? [language(filters.language)] : (profile?.languages || []).map(language);
    const plats = filters.platform ? [platform(filters.platform)] : (profile?.platforms || []).map(platform);
    if (m.languages.length && langs.length && !langs.some(l => m.languages.map(language).includes(l)))
        return mismatch('Explicit language mismatch');
    if (m.platforms.length && plats.length && !plats.some(p => m.platforms.map(platform).includes(p)))
        return mismatch('Explicit platform mismatch');
    const family = filters.apiFamily || profile?.apiFamily;
    if (family && m.apiFamily && m.apiFamily !== family)
        return mismatch('API family mismatch');
    if (filters.language && !m.languages.length && m.kind === 'api')
        return unknown('API source language is unverified');
    if (filters.platform && !m.platforms.length && m.kind === 'api')
        return unknown('API source platform is unverified');
    if (family && !m.apiFamily && m.kind === 'api')
        return unknown('API family is unverified');
    let requested = filters.version;
    if (!requested && m.library && profile) {
        const deps = profile.dependencies.filter(d => d.name.toLowerCase() === m.library.toLowerCase() && (!m.ecosystem || m.ecosystem === 'generic' || m.ecosystem === d.ecosystem));
        const resolved = [...new Set(deps.map(d => d.resolved).filter((v): v is string => !!v))];
        if (resolved.length === 1)
            requested = resolved[0];
        else if (resolved.length > 1)
            return unknown('Multiple workspace versions; select an exact version for this task');
        else if (deps.length)
            return unknown('Dependency is declared, not resolved; select or record an exact version');
    }
    if (requested)
        return versionCompatibility(requested, c.version, m.versionRange, m.ecosystem);
    if (m.kind === 'api')
        return unknown('No target API version was established');
    reasons.push('General/project material; no API-version compatibility is inferred');
    return { status: ['unversioned', 'workspace', ''].includes(c.version) ? 'unversioned' : 'unknown', reasons };
}
export function eligible(c: Collection, profile: Profile | undefined, filters: SearchFilters = {}): {
    allowed: boolean;
    compatibility: Compatibility;
} {
    const compatibility = applicability(c, profile, filters);
    const requiresProof = (c.metadata?.kind === 'api' || !!filters.version || !!filters.library);
    return { allowed: compatibility.status !== 'mismatch' && (compatibility.status !== 'unknown' || !requiresProof || filters.includeUnverified === true), compatibility };
}
