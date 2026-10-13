import fs from 'node:fs';
import path from 'node:path';
import { AppError, ensureDir, object } from './util.js';
import { cleanEnvironment, spawnOwned } from './process.js';
import { RpcClient } from './rpc.js';
import { checkedFile, looksSecret } from './security.js';
const ALLOWED = new Set(['find_symbol', 'find_referencing_symbols', 'get_symbols_overview', 'search_for_pattern', 'find_file', 'list_dir', 'read_file']);
export function serenaExe(home) { return path.join(home, 'runtime', 'serena', process.platform === 'win32' ? 'Scripts/serena.exe' : 'bin/serena'); }
export function filterTools(tools) { return tools.filter(t => ALLOWED.has(t.name)).map(t => ({ ...t, annotations: { ...t.annotations, readOnlyHint: true, destructiveHint: false } })); }
export function validateSerenaArgs(project, name, args) {
    if (!ALLOWED.has(name))
        throw new AppError('This Serena bridge exposes code navigation only. Codex performs edits using its native tools.', 403);
    const result = structuredClone(args);
    for (const key of ['relative_path', 'path']) {
        const value = result[key];
        if (typeof value === 'string' && value.trim()) {
            const file = checkedFile(project.root, value);
            if (fs.statSync(file).isFile() && fs.statSync(file).size > 1024 * 1024)
                throw new AppError('Code navigation is limited to files below 1 MiB.');
        }
    }
    if (name === 'read_file') {
        if (typeof result.relative_path !== 'string' || !result.relative_path)
            throw new AppError('read_file requires a project-relative path.');
        result.max_answer_chars = Math.min(typeof result.max_answer_chars === 'number' ? result.max_answer_chars : 12000, 20000);
    }
    if (name === 'search_for_pattern') {
        // Do not let a broad grep search credential/config directories.
        result.restrict_search_to_code_files = true;
        result.paths_exclude_glob = '**/{.env*,.git,.codex,.serena,.ssh,.aws,node_modules,.venv,venv}/**';
    }
    if ('max_answer_chars' in result) {
        if (typeof result.max_answer_chars !== 'number' || result.max_answer_chars <= 0)
            result.max_answer_chars = 12000;
        else
            result.max_answer_chars = Math.min(result.max_answer_chars, 24000);
    }
    return result;
}
export class Serena {
    home;
    project;
    rpc;
    ready;
    tools = [];
    constructor(home, project) {
        this.home = home;
        this.project = project;
    }
    async start() {
        if (!this.ready)
            this.ready = (async () => {
                const executable = serenaExe(this.home);
                if (!fs.existsSync(executable))
                    throw new AppError('Serena is not installed. Run Install.bat to repair the isolated Python runtime.', 503);
                const projectHome = path.join(this.home, 'projects', this.project.id, 'serena-home');
                ensureDir(projectHome);
                const child = spawnOwned(executable, ['start-mcp-server', '--project', this.project.root, '--context', 'codex', '--transport', 'stdio', '--enable-web-dashboard', 'false', '--open-web-dashboard', 'false', '--log-level', 'WARNING'], { cwd: this.project.root, env: cleanEnvironment({ SERENA_HOME: projectHome, PYTHONNOUSERSITE: '1' }) });
                const logFile = path.join(this.home, 'logs', `serena-${this.project.id}.log`);
                ensureDir(path.dirname(logFile));
                child.stderr?.on('data', (chunk) => fs.appendFileSync(logFile, chunk));
                const rpc = new RpcClient(child);
                this.rpc = rpc;
                await rpc.initialize();
                const value = object(await rpc.request('tools/list'));
                if (!Array.isArray(value.tools))
                    throw new AppError('Serena did not advertise tools.', 502);
                this.tools = filterTools(value.tools);
                if (!this.tools.some(t => t.name === 'find_symbol'))
                    throw new AppError('Installed Serena does not provide the expected symbolic navigation interface.', 502);
            })().catch(error => { this.rpc?.close(); this.rpc = undefined; this.ready = undefined; throw error; });
        await this.ready;
    }
    async list() { await this.start(); return this.tools; }
    async call(name, args) {
        const validated = validateSerenaArgs(this.project, name, args);
        await this.start();
        if (!this.tools.some(t => t.name === name))
            throw new AppError('This tool is unavailable for the installed Serena version.');
        const result = await this.rpc.request('tools/call', { name, arguments: validated }, 80000);
        if (looksSecret(Buffer.from(JSON.stringify(result))))
            throw new AppError('Possible credential-bearing code output was suppressed.', 403);
        if (Buffer.byteLength(JSON.stringify(result)) > Math.max(3000, this.project.budget * 3))
            throw new AppError('Code response exceeds the project budget. Narrow the symbol/path or use line ranges and max_answer_chars.');
        return result;
    }
    close() { this.rpc?.close(); this.rpc = undefined; this.ready = undefined; }
}
//# sourceMappingURL=serena.js.map