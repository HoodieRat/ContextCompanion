import type { Readable, Writable } from 'node:stream';
import type { ChildProcess } from 'node:child_process';
export type Tool = {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations?: Record<string, unknown>;
};
export type ToolResult = {
    content: {
        type: 'text';
        text: string;
    }[];
    isError?: boolean;
};
export declare const toolText: (value: unknown, isError?: boolean) => ToolResult;
export declare function serveMcp(options: {
    name: string;
    version: string;
    instructions: string;
    list: () => Promise<Tool[]>;
    call: (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<ToolResult>;
    input?: Readable;
    output?: Writable;
    close?: () => Promise<void>;
}): Promise<void>;
export declare class RpcClient {
    readonly child: ChildProcess;
    private sequence;
    private pending;
    private dead;
    constructor(child: ChildProcess);
    request(method: string, params?: unknown, timeoutMs?: number): Promise<unknown>;
    notify(method: string, params?: unknown): void;
    initialize(): Promise<void>;
    close(): void;
}
