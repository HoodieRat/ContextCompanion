import type { Collection, Compatibility, Metadata, Profile, SearchFilters } from './types.js';
export declare function language(value: string): string;
export declare function platform(value: string): string;
export declare function parseMetadata(input: unknown, current?: Metadata): Metadata;
export declare function parseFilters(input: unknown): SearchFilters;
export declare function versionCompatibility(requested: string, stored: string, range: string, ecosystem: string): Compatibility;
export declare function applicability(c: Collection, profile: Profile | undefined, filters?: SearchFilters): Compatibility;
export declare function eligible(c: Collection, profile: Profile | undefined, filters?: SearchFilters): {
    allowed: boolean;
    compatibility: Compatibility;
};
