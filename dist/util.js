import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
export const VERSION = '1.1.0-rc.1';
export const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const now = () => new Date().toISOString();
export const id = () => crypto.randomUUID();
export const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const errorText = (error) => error instanceof Error ? error.message : String(error);
export class AppError extends Error {
    status;
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}
export function defaultHome() {
    return path.resolve(process.env.CONTEXT_COMPANION_HOME || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'), 'ContextCompanion'));
}
export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }); }
export function atomicWrite(file, contents) {
    ensureDir(path.dirname(file));
    const temporary = `${file}.${process.pid}.${crypto.randomBytes(5).toString('hex')}.tmp`;
    const fd = fs.openSync(temporary, 'wx', 0o600);
    try {
        fs.writeFileSync(fd, contents);
        fs.fsyncSync(fd);
    }
    finally {
        fs.closeSync(fd);
    }
    try {
        fs.renameSync(temporary, file);
    }
    catch (error) {
        fs.rmSync(temporary, { force: true });
        throw error;
    }
}
export const writeJson = (file, value) => atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
export function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
export function object(value, name = 'request') {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        throw new AppError(`${name} must be an object.`);
    return value;
}
export function text(value, name, max = 2000, allowEmpty = false) {
    if (typeof value !== 'string' || value.length > max || value.includes('\0') || (!allowEmpty && !value.trim())) {
        throw new AppError(`${name} must be ${allowEmpty ? '' : 'nonempty '}text, up to ${max} characters.`);
    }
    return value.trim();
}
export function integer(value, fallback, min, max) {
    if (value === undefined)
        return fallback;
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
        throw new AppError(`Expected an integer between ${min} and ${max}.`);
    }
    return value;
}
export function strings(value, maxItems = 100, maxLength = 200) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value) || value.length > maxItems)
        throw new AppError(`Expected at most ${maxItems} strings.`);
    return [...new Set(value.map(item => text(item, 'item', maxLength)))];
}
export function isWithin(root, candidate) {
    const relative = path.relative(path.resolve(root), path.resolve(candidate));
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export function requireId(value) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(value))
        throw new AppError('Invalid identifier.');
    return value;
}
export function cutUtf8(value, maxBytes) {
    if (maxBytes <= 0)
        return '';
    if (Buffer.byteLength(value) <= maxBytes)
        return value;
    const buf = Buffer.from(value);
    let end = maxBytes;
    while (end > 0 && ((buf[end] ?? 0) & 0xc0) === 0x80)
        end--;
    return buf.subarray(0, end).toString('utf8');
}
export function stripAnsi(value) { return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''); }
export function processAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export async function withTimeout(promise, ms, message) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new AppError(message, 504)), ms); })]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
export function backup(file, home) {
    if (!fs.existsSync(file))
        return;
    const dir = path.join(home, 'backups');
    ensureDir(dir);
    const name = `${Date.now()}-${hash(file).slice(0, 12)}-${path.basename(file)}`;
    fs.copyFileSync(file, path.join(dir, name));
    fs.appendFileSync(path.join(dir, 'manifest.jsonl'), JSON.stringify({ original: file, backup: name, at: now() }) + '\n', { mode: 0o600 });
}
//# sourceMappingURL=util.js.map