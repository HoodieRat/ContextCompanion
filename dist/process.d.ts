import { type ChildProcess } from 'node:child_process';
export declare const ownedChildren: Set<ChildProcess>;
export declare function cleanEnvironment(extra?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export declare function stopChild(child: ChildProcess): void;
export declare function spawnOwned(command: string, args: string[], options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    piped?: boolean;
}): ChildProcess;
export declare function run(command: string, args: string[], options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    logFile?: string;
    signal?: AbortSignal;
    maxOutput?: number;
    onLine?: (line: string) => void;
}): Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
