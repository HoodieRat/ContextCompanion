import type { JsonObject } from './types.js';
export declare const VERSION = "1.1.0-rc.1";
export declare const APP_ROOT: string;
export declare const now: () => string;
export declare const id: () => string;
export declare const hash: (value: string | Buffer) => string;
export declare const sleep: (ms: number) => Promise<void>;
export declare const errorText: (error: unknown) => string;
export declare class AppError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
export declare function defaultHome(): string;
export declare function ensureDir(dir: string): void;
export declare function atomicWrite(file: string, contents: string | Buffer): void;
export declare const writeJson: (file: string, value: unknown) => void;
export declare function readJson<T>(file: string): T;
export declare function object(value: unknown, name?: string): JsonObject;
export declare function text(value: unknown, name: string, max?: number, allowEmpty?: boolean): string;
export declare function integer(value: unknown, fallback: number, min: number, max: number): number;
export declare function strings(value: unknown, maxItems?: number, maxLength?: number): string[];
export declare function isWithin(root: string, candidate: string): boolean;
export declare function requireId(value: string): string;
export declare function cutUtf8(value: string, maxBytes: number): string;
export declare function stripAnsi(value: string): string;
export declare function processAlive(pid: number): boolean;
export declare function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T>;
export declare function backup(file: string, home: string): void;
