import fs from 'node:fs';
import path from 'node:path';
import { Store, readRegistry } from './state.js';
import { AppError, atomicWrite, ensureDir, hash, id, isWithin, now, object, processAlive, readJson, text, writeJson } from './util.js';
type BackupFile = {
    path: string;
    sha256: string;
    bytes: number;
};
type BackupManifest = {
    format: 1;
    id: string;
    createdAt: string;
    home: string;
    registryRevision: number;
    files: BackupFile[];
    checksum: string;
};
function safeRelative(relative: string): boolean { return !path.isAbsolute(relative) && !relative.includes('\\') && !relative.includes('\0') && !relative.split('/').some(x => x === '..' || x === '' || x === '.') && /^(?:state\.json$|collections\/|sources\/|projects\/|logs\/jobs\/)/.test(relative); }
function digest(value: Omit<BackupManifest, 'checksum'>): string { return hash(JSON.stringify(value)); }
async function copyTree(source: string, destination: string, prefix: string, files: BackupFile[]): Promise<void> {
    if (!fs.existsSync(source))
        return;
    const stat = await fs.promises.lstat(source);
    if (stat.isSymbolicLink())
        throw new AppError(`Refusing a symbolic link in backup: ${prefix}`);
    if (stat.isDirectory()) {
        ensureDir(destination);
        for (const name of (await fs.promises.readdir(source)).sort())
            await copyTree(path.join(source, name), path.join(destination, name), prefix + '/' + name, files);
        return;
    }
    if (!stat.isFile())
        throw new AppError(`Unsupported file in backup: ${prefix}`);
    if (files.length >= 100000)
        throw new AppError('Backup file limit exceeded. Prune unneeded generations first.');
    ensureDir(path.dirname(destination));
    await fs.promises.copyFile(source, destination);
    const content = await fs.promises.readFile(destination);
    files.push({ path: prefix, sha256: hash(content), bytes: content.length });
}
export async function createBackup(store: Store): Promise<BackupManifest> {
    // Caller pauses writes and readers. Published generations have no active SQLite writer.
    if (store.data.jobs.some(j => ['queued', 'running'].includes(j.state)))
        throw new AppError('Finish or cancel indexing/checks before backup.', 409);
    const backupId = id(), root = path.join(store.home, 'backups', backupId), stage = root + '.partial';
    ensureDir(stage);
    const files: BackupFile[] = [];
    const snapshot = store.data;
    try {
        await copyTree(store.file, path.join(stage, 'state.json'), 'state.json', files);
        for (const collection of snapshot.collections)
            for (const generation of [collection.active, collection.previous])
                if (generation) {
                    const relative = `collections/${collection.id}/generations/${generation.id}`;
                    const source = path.join(store.home, relative);
                    if (!fs.existsSync(source))
                        throw new AppError(`Published generation is missing: ${generation.id}. Run diagnostics before backing up.`);
                    if (!files.some(f => f.path.startsWith(relative + '/')))
                        await copyTree(source, path.join(stage, relative), relative, files);
                }
        for (const relative of ['sources', 'projects', 'logs/jobs'])
            await copyTree(path.join(store.home, relative), path.join(stage, relative), relative, files);
        if (store.data.revision !== snapshot.revision)
            throw new AppError('Registry changed during backup; snapshot discarded.', 409);
        files.sort((a, b) => a.path.localeCompare(b.path));
        const plain: Omit<BackupManifest, 'checksum'> = { format: 1, id: backupId, createdAt: now(), home: path.resolve(store.home), registryRevision: snapshot.revision, files };
        const manifest = { ...plain, checksum: digest(plain) };
        writeJson(path.join(stage, 'manifest.json'), manifest);
        fs.renameSync(stage, root);
        return manifest;
    }
    catch (error) {
        fs.rmSync(stage, { recursive: true, force: true });
        throw error;
    }
}
export function inspectBackup(home: string, backupId: string): BackupManifest {
    if (!/^[a-f0-9-]{36}$/.test(backupId))
        throw new AppError('Invalid backup identifier.');
    const root = path.join(home, 'backups', backupId);
    const raw = readJson<BackupManifest>(path.join(root, 'manifest.json'));
    const { checksum, ...plain } = raw;
    if (raw.format !== 1 || raw.id !== backupId || digest(plain) !== checksum || path.resolve(raw.home) !== path.resolve(home))
        throw new AppError('Backup manifest checksum, format or original home does not match.');
    if (!Array.isArray(raw.files) || raw.files.length > 100000)
        throw new AppError('Invalid backup file list.');
    const seen = new Set<string>();
    for (const entry of raw.files) {
        if (!safeRelative(entry.path) || seen.has(entry.path))
            throw new AppError('Unsafe or duplicate backup path.');
        seen.add(entry.path);
        let current = root;
        for (const part of entry.path.split('/')) {
            current = path.join(current, part);
            if (fs.lstatSync(current).isSymbolicLink())
                throw new AppError('Backup symlinks are forbidden.');
        }
        const bytes = fs.readFileSync(current);
        if (bytes.length !== entry.bytes || hash(bytes) !== entry.sha256)
            throw new AppError(`Backup checksum failure: ${entry.path}`);
    }
    if (!seen.has('state.json'))
        throw new AppError('Backup is missing the registry.');
    const state = readRegistry(path.join(root, 'state.json'));
    for (const c of state.collections)
        for (const g of [c.active, c.previous])
            if (g && !seen.has(`collections/${c.id}/generations/${g.id}/generation.json`))
                throw new AppError('Backup lacks a referenced generation.');
    return raw;
}
export function listBackups(home: string): Record<string, unknown>[] {
    const root = path.join(home, 'backups');
    if (!fs.existsSync(root))
        return [];
    return fs.readdirSync(root).filter(x => /^[a-f0-9-]{36}$/.test(x)).map(x => { try {
        const m = readJson<BackupManifest>(path.join(root, x, 'manifest.json'));
        return { id: x, createdAt: m.createdAt, files: m.files.length, registryRevision: m.registryRevision, checksum: m.checksum };
    }
    catch {
        return { id: x, error: 'Unreadable backup manifest' };
    } }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function restoreBackup(home: string, backupId: string): Record<string, unknown> {
    const lock = path.join(home, 'daemon.lock');
    if (fs.existsSync(lock)) {
        const owner = object(readJson(lock));
        if (typeof owner.pid !== 'number' || processAlive(owner.pid))
            throw new AppError('Stop Context Companion before restoring a backup.', 409);
    }
    const manifest = inspectBackup(home, backupId), root = path.join(home, 'backups', backupId), marker = path.join(home, 'restore-pending.json');
    // Never delete source projects or working generations. Verify all inputs first, restore app-owned files,
    // then atomically publish state last. A crash leaves a marker that blocks startup until this is rerun.
    writeJson(marker, { backupId, startedAt: now() });
    const currentFile = path.join(home, 'state.json');
    if (fs.existsSync(currentFile))
        fs.copyFileSync(currentFile, path.join(home, 'state.before-restore.json'));
    for (const file of manifest.files.filter(f => f.path !== 'state.json')) {
        const target = path.join(home, file.path);
        if (!isWithin(home, target))
            throw new AppError('Restore destination escaped home.');
        let parent = home;
        for (const segment of file.path.split('/')) {
            parent = path.join(parent, segment);
            if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink())
                throw new AppError('Restore refused a symlink destination.');
        }
        const data = fs.readFileSync(path.join(root, file.path));
        if (hash(data) !== file.sha256)
            throw new AppError('Backup changed while restoring.');
        atomicWrite(target, data);
    }
    atomicWrite(currentFile, fs.readFileSync(path.join(root, 'state.json')));
    readRegistry(currentFile);
    fs.rmSync(marker, { force: true });
    return { restored: backupId, files: manifest.files.length, registryRevision: manifest.registryRevision, notice: 'Application data restored. User project files and Codex settings outside this data folder were not modified. Reconnect projects after reviewing them.' };
}
