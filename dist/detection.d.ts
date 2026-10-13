import type { Profile } from './types.js';
export declare function parseProfile(input: unknown): Profile;
export declare function detect(root: string, files: string[], home?: string): Promise<{
    profile: Profile;
    warnings: string[];
}>;
