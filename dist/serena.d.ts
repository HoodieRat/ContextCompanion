import type { Project } from './types.js';
import { type Tool, type ToolResult } from './rpc.js';
export declare function serenaExe(home: string): string;
export declare function filterTools(tools: Tool[]): Tool[];
export declare function validateSerenaArgs(project: Project, name: string, args: Record<string, unknown>): Record<string, unknown>;
export declare class Serena {
    readonly home: string;
    readonly project: Project;
    private rpc?;
    private ready?;
    private tools;
    constructor(home: string, project: Project);
    private start;
    list(): Promise<Tool[]>;
    call(name: string, args: Record<string, unknown>): Promise<ToolResult>;
    close(): void;
}
