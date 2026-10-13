import type { Check, Project } from './types.js';
export declare function resolveCheck(check: Check): {
    command: string;
    args: string[];
};
export declare function runChecks(project: Project, logFile: string, signal: AbortSignal): Promise<string>;
