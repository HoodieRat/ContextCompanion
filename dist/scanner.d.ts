import type { Dependency, Profile, Project } from './types.js';
export type Scan = {
    files: {
        relative: string;
        absolute: string;
        hash: string;
        size: number;
        stagedRelative?: string;
    }[];
    skipped: {
        path: string;
        reason: string;
    }[];
    fingerprint: string;
};
export declare function scan(rootInput: string, options?: {
    exclusions?: string[];
    forbiddenRoot?: string;
    maxFiles?: number;
    maxTotal?: number;
}): Promise<Scan>;
export declare function snapshot(source: string, destination: string, exclusions: string[], forbiddenRoot: string): Promise<Scan>;
export type ProjectMap = {
    generatedAt: string;
    fingerprint: string;
    languages: string[];
    dependencies: Record<string, string>;
    dependencyEvidence: Dependency[];
    profile: Profile;
    files: string[];
    totalFiles: number;
    warnings: string[];
    architecture: string;
};
export declare function projectMap(project: Project, home?: string): Promise<ProjectMap>;
export declare function saveMap(home: string, project: Project, map: ProjectMap): void;
