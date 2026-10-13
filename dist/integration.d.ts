import type { Project } from './types.js';
export declare function replaceManaged(value: string, body: string, begin?: string, end?: string): string;
export declare function hookCommand(home: string, projectId: string, node?: string, appRoot?: string): {
    command: string;
    commandWindows: string;
};
export declare function mergeHooks(existing: unknown, home: string, project: Project, enabled: boolean): Record<string, unknown>;
export declare function mcpBlock(home: string, project: Project, node?: string, appRoot?: string): string;
export declare function integrate(home: string, project: Project, enable: boolean): Promise<{
    files: string[];
    warnings: string[];
}>;
