import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { RuntimeRecord } from './types.js';
import { APP_ROOT, AppError, ensureDir, readJson, sleep } from './util.js';
import { cleanEnvironment } from './process.js';
export async function api(record: RuntimeRecord, endpoint: string, method = 'GET', body?: unknown, timeoutMs = 60000, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(`http://127.0.0.1:${record.port}${endpoint}`, { method, headers: { Authorization: `Bearer ${record.token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs) });
    const value = await response.json() as Record<string, unknown>;
    if (!response.ok)
        throw new AppError(typeof value.error === 'string' ? value.error : `Request failed (${response.status}).`, response.status);
    return value;
}
export async function findDaemon(home: string): Promise<RuntimeRecord | undefined> {
    try {
        const record = readJson<RuntimeRecord>(path.join(home, 'daemon.json'));
        await api(record, '/api/health', 'GET', undefined, 1500);
        return record;
    }
    catch {
        return undefined;
    }
}
export async function ensureDaemon(home: string, timeoutMs = 10000): Promise<RuntimeRecord> {
    const found = await findDaemon(home);
    if (found)
        return found;
    ensureDir(path.join(home, 'logs'));
    const fd = fs.openSync(path.join(home, 'logs', 'daemon.log'), 'a', 0o600);
    const child = spawn(process.execPath, [path.join(APP_ROOT, 'dist', 'cli.js'), 'serve', '--home', home], { cwd: APP_ROOT, env: cleanEnvironment(), windowsHide: true, detached: true, stdio: ['ignore', fd, fd] });
    fs.closeSync(fd);
    child.on('error', () => undefined);
    child.unref();
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        await sleep(200);
        const record = await findDaemon(home);
        if (record)
            return record;
    }
    throw new AppError(`Context Companion did not start. Inspect ${path.join(home, 'logs', 'daemon.log')}.`, 503);
}
