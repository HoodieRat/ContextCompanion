import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createBackup, listBackups, inspectBackup } from './recovery.js';
import { parseFilters } from './compatibility.js';
import { Service } from './service.js';
import { authenticated } from './security.js';
import { APP_ROOT, AppError, ensureDir, errorText, integer, now, object, processAlive, readJson, strings, text, writeJson } from './util.js';
import type { RuntimeRecord } from './types.js';
import { projectMap, saveMap } from './scanner.js';
import { run } from './process.js';
export async function bodyJson(req: http.IncomingMessage): Promise<unknown> {
    if (!req.headers['content-type']?.startsWith('application/json'))
        throw new AppError('Content-Type application/json is required.', 415);
    const limit = 16 * 1024 * 1024;
    let bytes = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > limit)
            throw new AppError('Request exceeds 16 MiB.', 413);
        chunks.push(buffer);
    }
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        throw new AppError('Invalid JSON request.');
    }
}
export async function startServer(home: string, port = 0): Promise<{
    server: http.Server;
    service: Service;
    record: RuntimeRecord;
    close: () => Promise<void>;
}> {
    ensureDir(home);
    const lock = path.join(home, 'daemon.lock');
    const acquire = () => { const fd = fs.openSync(lock, 'wx', 0o600); fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: now() })); fs.closeSync(fd); };
    try {
        acquire();
    }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST')
            throw error;
        let owner: number | undefined;
        try {
            owner = readJson<{
                pid: number;
            }>(lock).pid;
        }
        catch {
            throw new AppError('Daemon lock is unreadable. Close all Context Companion processes and remove daemon.lock before starting.', 503);
        }
        if (processAlive(owner))
            throw new AppError('Context Companion is already running.', 409);
        fs.rmSync(lock, { force: true });
        acquire();
    }
    let service: Service;
    try {
        service = new Service(home);
    }
    catch (error) {
        fs.rmSync(lock, { force: true });
        throw error;
    }
    const token = crypto.randomBytes(32).toString('hex');
    let actualPort = 0;
    let closing = false;
    const send = (res: http.ServerResponse, status: number, value: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
    const server = http.createServer(async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        const controller = new AbortController();
        res.once('close', () => { if (!res.writableEnded)
            controller.abort(); });
        try {
            if (req.headers.host !== `127.0.0.1:${actualPort}` && req.headers.host !== `localhost:${actualPort}`)
                throw new AppError('Invalid Host header.', 403);
            const url = new URL(req.url || '/', `http://127.0.0.1:${actualPort}`);
            if (!url.pathname.startsWith('/api/')) {
                const files: Record<string, [
                    string,
                    string
                ]> = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'] };
                const asset = files[url.pathname];
                if (req.method !== 'GET' || !asset)
                    throw new AppError('Not found.', 404);
                res.writeHead(200, { 'Content-Type': asset[1] });
                res.end(fs.readFileSync(path.join(APP_ROOT, 'public', asset[0])));
                return;
            }
            authenticated(req, token, actualPort);
            const parts = url.pathname.split('/').filter(Boolean);
            const method = req.method || 'GET';
            const input = method === 'POST' || method === 'PUT' ? await bodyJson(req) : {};
            const body = object(input);
            if (service.maintenance && method !== 'GET')
                throw new AppError('Application maintenance is in progress; retry this write afterwards.', 409);
            let result: unknown;
            if (method === 'GET' && url.pathname === '/api/health')
                result = { ready: !closing, version: '1.1.0-rc.1' };
            else if (method === 'GET' && url.pathname === '/api/status')
                result = await service.status();
            else if (method === 'POST' && url.pathname === '/api/shutdown') {
                send(res, 200, { ok: true });
                setImmediate(() => void close());
                return;
            }
            else if (method === 'POST' && url.pathname === '/api/projects')
                result = await service.addProject(body);
            else if (parts[1] === 'projects' && parts[2]) {
                const projectId = parts[2];
                service.store.project(projectId);
                if (method === 'GET' && parts.length === 3)
                    result = service.store.project(projectId);
                else if (method === 'PUT' && parts.length === 3)
                    result = await service.updateProject(projectId, body);
                else if (method === 'DELETE' && parts.length === 3) {
                    await service.removeProject(projectId);
                    result = { ok: true };
                }
                else if (method === 'POST' && parts[3] === 'link')
                    result = await service.link(projectId, body.enable !== false);
                else if (method === 'POST' && parts[3] === 'attach')
                    result = service.attach(projectId, text(body.sourceId, 'sourceId', 100), body.attach !== false);
                else if (method === 'POST' && parts[3] === 'search') {
                    result = await service.retrieval.search(projectId, text(body.query, 'query', 4000), { sourceIds: strings(body.sourceIds, 12, 100), budget: integer(body.budget, service.store.project(projectId).budget, 500, 8000), signal: controller.signal, filters: parseFilters(body.filters || {}), mode: body.mode === 'lexical' ? 'lexical' : 'auto' });
                    service.rememberRetrieval(projectId, result);
                }
                else if (method === 'GET' && parts[3] === 'map')
                    result = service.retrieval.summary(projectId);
                else if (method === 'POST' && parts[3] === 'map')
                    result = await service.rescan(projectId);
                else if (method === 'POST' && parts[3] === 'detect') {
                    service.store.update(s => { s.projects.find(p => p.id === projectId)!.profileManual = false; });
                    result = await service.rescan(projectId);
                }
                else if (method === 'GET' && parts[3] === 'last-retrieval') {
                    const file = path.join(home, 'projects', projectId, 'last-retrieval.json');
                    result = fs.existsSync(file) ? readJson(file) : { message: 'No retrieval has run for this project yet.' };
                }
                else if (method === 'GET' && parts[3] === 'handoff')
                    result = service.handoff(projectId);
                else if (method === 'GET' && parts[3] === 'memories')
                    result = service.memories(projectId, false, url.searchParams.get('history') === 'true');
                else if (method === 'POST' && parts[3] === 'memories')
                    result = service.remember(projectId, body);
                else if (method === 'PUT' && parts[3] === 'memories' && parts[4])
                    result = service.remember(projectId, body, 'user', parts[4]);
                else if (method === 'POST' && parts[3] === 'checks')
                    result = service.jobs.enqueue('checks', projectId);
                else if (method === 'POST' && parts[3] === 'open') {
                    if (process.platform !== 'win32')
                        throw new AppError('Open Folder is available in the Windows package.');
                    await run('explorer.exe', [service.store.project(projectId).root], { cwd: APP_ROOT, timeoutMs: 10000 });
                    result = { ok: true };
                }
                else
                    throw new AppError('Not found.', 404);
            }
            else if (method === 'POST' && url.pathname === '/api/collections')
                result = await service.addCollection(body);
            else if (parts[1] === 'collections' && parts[2]) {
                const sourceId = parts[2];
                const collection = service.store.collection(sourceId);
                if (method === 'PUT' && parts.length === 3)
                    result = await service.updateCollection(sourceId, body);
                else if (method === 'DELETE' && parts.length === 3) {
                    service.deleteCollection(sourceId);
                    result = { ok: true };
                }
                else if (method === 'POST' && parts[3] === 'refresh')
                    result = service.jobs.enqueue('index', sourceId);
                else if (method === 'POST' && parts[3] === 'rollback') {
                    if (!collection.previous)
                        throw new AppError('No prior generation is available.');
                    if (collection.needsRefresh || collection.previous.sourceRevision !== (collection.revision || 1))
                        throw new AppError('Source policy changed since the previous generation. Reindex instead of rolling back.');
                    if (service.store.data.jobs.some(j => j.targetId === sourceId && ['queued', 'running'].includes(j.state)))
                        throw new AppError('Wait for the active indexing job before rolling back.');
                    result = service.store.update(s => { const c = s.collections.find(c => c.id === sourceId)!; [c.active, c.previous] = [c.previous, c.active]; return c; });
                }
                else if (method === 'GET' && parts[3] === 'report') {
                    if (!collection.active)
                        throw new AppError('No successful local-file scan report exists yet.');
                    const file = path.join(service.grounded.generationDir(collection.id, collection.active.id), 'scan-report.json');
                    result = fs.existsSync(file) ? readJson(file) : { message: 'This source was crawled from the web. Read its indexing job log for crawler output.' };
                }
                else
                    throw new AppError('Not found.', 404);
            }
            else if (parts[1] === 'mcp' && parts[2] && method === 'POST')
                result = await service.mcp(parts[2], text(body.name, 'tool name', 100), object(body.arguments || {}), controller.signal);
            else if (parts[1] === 'hook' && parts[2] && method === 'POST')
                result = await service.hook(parts[2], body, controller.signal);
            else if (parts[1] === 'jobs' && parts[2]) {
                const job = service.store.data.jobs.find(j => j.id === parts[2]);
                if (!job)
                    throw new AppError('Job not found.', 404);
                if (method === 'POST' && parts[3] === 'cancel') {
                    service.jobs.cancel(job.id);
                    result = { ok: true };
                }
                else if (method === 'POST' && parts[3] === 'retry')
                    result = service.jobs.retry(job.id);
                else if (method === 'GET' && parts[3] === 'log') {
                    const file = job.logFile;
                    if (!fs.existsSync(file))
                        result = { text: 'Job has not produced a log yet.' };
                    else {
                        const size = fs.statSync(file).size;
                        const length = Math.min(size, 128 * 1024);
                        const fd = fs.openSync(file, 'r');
                        const buffer = Buffer.alloc(length);
                        try {
                            fs.readSync(fd, buffer, 0, length, size - length);
                        }
                        finally {
                            fs.closeSync(fd);
                        }
                        result = { text: buffer.toString('utf8'), truncated: size > length };
                    }
                }
                else
                    throw new AppError('Not found.', 404);
            }
            else if (method === 'PUT' && url.pathname === '/api/settings')
                result = await service.settings(body);
            else if (method === 'POST' && url.pathname === '/api/embedding/probe')
                result = await service.embeddings.probe(service.store.data.settings.embedding);
            else if (method === 'POST' && url.pathname === '/api/verify')
                result = service.jobs.enqueue('verify', 'installation');
            else if (method === 'GET' && url.pathname === '/api/backups')
                result = listBackups(home);
            else if (method === 'POST' && url.pathname === '/api/backups') {
                if (service.retrieval.activeReaders)
                    throw new AppError('Wait for active retrievals before backup.', 409);
                service.maintenance = true;
                try {
                    result = await createBackup(service.store);
                }
                finally {
                    service.maintenance = false;
                }
            }
            else if (method === 'POST' && parts[1] === 'backups' && parts[2] && parts[3] === 'inspect')
                result = inspectBackup(home, parts[2]);
            else if (method === 'POST' && url.pathname === '/api/prune')
                result = service.prune();
            else if (method === 'POST' && url.pathname === '/api/pick-folder') {
                if (process.platform !== 'win32')
                    throw new AppError('The native folder picker is Windows-only. Paste an absolute folder path instead.');
                const picked = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', path.join(APP_ROOT, 'scripts', 'Pick-Folder.ps1')], { cwd: APP_ROOT, timeoutMs: 180000 });
                result = { path: picked.stdout.trim() };
            }
            else
                throw new AppError('Not found.', 404);
            if (!res.destroyed)
                send(res, 200, result);
        }
        catch (error) {
            if (!res.destroyed && !res.headersSent)
                send(res, error instanceof AppError ? error.status : 500, { error: errorText(error) });
        }
    });
    server.requestTimeout = 300000;
    server.headersTimeout = 10000;
    server.keepAliveTimeout = 5000;
    const close = async () => {
        if (closing)
            return;
        closing = true;
        service.close();
        await service.jobs.settled();
        await new Promise<void>(resolve => { server.close(() => resolve()); server.closeIdleConnections(); setTimeout(() => { server.closeAllConnections(); resolve(); }, 1500).unref(); });
        try {
            const record = readJson<RuntimeRecord>(path.join(home, 'daemon.json'));
            if (record.pid === process.pid)
                fs.rmSync(path.join(home, 'daemon.json'), { force: true });
        }
        catch { /*Already removed.*/ }
        fs.rmSync(lock, { force: true });
    };
    try {
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
        const address = server.address();
        if (!address || typeof address === 'string')
            throw new Error('HTTP port not assigned.');
        actualPort = address.port;
        const record: RuntimeRecord = { pid: process.pid, port: actualPort, token, startedAt: now(), appRoot: APP_ROOT };
        writeJson(path.join(home, 'daemon.json'), record);
        service.start();
        return { server, service, record, close };
    }
    catch (error) {
        service.close();
        fs.rmSync(lock, { force: true });
        throw error;
    }
}
