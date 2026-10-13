import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AppError, ensureDir, stripAnsi, errorText } from './util.js';
export const ownedChildren = new Set<ChildProcess>();
// Do not forward provider credentials, preload flags, or accidental .env files to indexing tools.
export function cleanEnvironment(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'home', 'userprofile', 'appdata', 'localappdata', 'programfiles', 'programfiles(x86)', 'programdata', 'lang', 'lc_all', 'ssl_cert_file', 'ssl_cert_dir']);
    for (const [key, value] of Object.entries(process.env))
        if (allowed.has(key.toLowerCase()))
            env[key] = value;
    return { ...env, NO_COLOR: '1', DO_NOT_TRACK: '1', ...extra };
}
export function stopChild(child: ChildProcess): void {
    if (!child.pid || child.exitCode !== null)
        return;
    if (process.platform === 'win32') {
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false });
        killer.on('error', () => child.kill());
    }
    else {
        try {
            process.kill(-child.pid, 'SIGTERM');
        }
        catch {
            child.kill('SIGTERM');
        }
        const timer = setTimeout(() => { try {
            process.kill(-child.pid!, 'SIGKILL');
        }
        catch { /* Already exited. */ } }, 1500);
        timer.unref();
    }
}
export function spawnOwned(command: string, args: string[], options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    piped?: boolean;
}): ChildProcess {
    const child = spawn(command, args, {
        cwd: options.cwd, env: options.env || cleanEnvironment(), windowsHide: true,
        shell: false, detached: process.platform !== 'win32', stdio: options.piped === false ? 'inherit' : ['pipe', 'pipe', 'pipe']
    });
    ownedChildren.add(child);
    child.once('exit', () => ownedChildren.delete(child));
    child.once('error', () => ownedChildren.delete(child));
    return child;
}
export async function run(command: string, args: string[], options: {
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
}> {
    if (options.signal?.aborted)
        throw new AppError('Operation cancelled.', 499);
    ensureDir(options.cwd);
    if (options.logFile)
        ensureDir(path.dirname(options.logFile));
    const child = spawnOwned(command, args, options);
    let stdout = '';
    let stderr = '';
    let ended = false;
    const max = options.maxOutput ?? 16 * 1024 * 1024;
    return new Promise((resolve, reject) => {
        const fail = (error: unknown) => {
            if (ended)
                return;
            ended = true;
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
            stopChild(child);
            reject(error);
        };
        const abort = () => fail(new AppError('Operation cancelled.', 499));
        const timer = setTimeout(() => fail(new AppError(`Process exceeded ${Math.round((options.timeoutMs ?? 120000) / 1000)} seconds. See its saved log.`, 504)), options.timeoutMs ?? 120000);
        options.signal?.addEventListener('abort', abort, { once: true });
        for (const [stream, isError] of [[child.stdout, false], [child.stderr, true]] as const)
            stream?.on('data', (buffer: Buffer) => {
                const chunk = stripAnsi(buffer.toString('utf8'));
                if (isError)
                    stderr += chunk;
                else
                    stdout += chunk;
                if (options.logFile)
                    fs.appendFileSync(options.logFile, chunk);
                if (options.onLine)
                    options.onLine(chunk.slice(-1000));
                if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > max)
                    fail(new AppError('Process output exceeded the safety limit. Full preceding output is in the job log.', 500));
            });
        child.once('error', error => fail(new AppError(`Cannot start ${path.basename(command)}: ${errorText(error)}`, 503)));
        child.once('close', code => {
            if (ended)
                return;
            ended = true;
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', abort);
            if (code !== 0)
                reject(new AppError(`${path.basename(command)} exited with code ${code ?? 'unknown'}: ${(stderr || stdout).slice(-2400).trim()}`, 502));
            else
                resolve({ stdout, stderr, code: code ?? 0 });
        });
        child.stdin?.end();
    });
}
