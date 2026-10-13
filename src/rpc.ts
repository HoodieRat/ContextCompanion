import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { ChildProcess } from 'node:child_process';
import { AppError, object, errorText, VERSION } from './util.js';
import { stopChild } from './process.js';
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
export const toolText = (value: unknown, isError = false): ToolResult => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) });
export async function serveMcp(options: {
    name: string;
    version: string;
    instructions: string;
    list: () => Promise<Tool[]>;
    call: (name: string, args: Record<string, unknown>, signal: AbortSignal) => Promise<ToolResult>;
    input?: Readable;
    output?: Writable;
    close?: () => Promise<void>;
}): Promise<void> {
    const input = options.input || process.stdin;
    const output = options.output || process.stdout;
    const pending = new Map<string, AbortController>();
    let initialized = false;
    let queue = '';
    let active = 0;
    const send = (value: unknown) => output.write(JSON.stringify(value) + '\n');
    const consume = async (line: string) => {
        let request: Record<string, unknown>;
        try {
            request = object(JSON.parse(line));
        }
        catch {
            send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid JSON object.' } });
            return;
        }
        const id = request.id;
        const hasId = typeof id === 'number' || typeof id === 'string';
        if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
            if (hasId)
                send({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid request.' } });
            return;
        }
        if (request.method === 'notifications/cancelled') {
            try {
                const params = object(request.params || {});
                pending.get(JSON.stringify(params.requestId))?.abort();
            }
            catch { /*Malformed notifications receive no response.*/ }
            return;
        }
        if (!hasId)
            return;
        if (pending.has(JSON.stringify(id))) {
            send({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Duplicate active request identifier.' } });
            return;
        }
        if (active >= 16) {
            send({ jsonrpc: '2.0', id, error: { code: -32000, message: 'Too many active requests.' } });
            return;
        }
        active++;
        const controller = new AbortController();
        pending.set(JSON.stringify(id), controller);
        try {
            const params = object(request.params || {});
            let result: unknown;
            switch (request.method) {
                case 'initialize': {
                    const supported = ['2025-06-18', '2025-03-26', '2024-11-05'];
                    const protocol = typeof params.protocolVersion === 'string' && supported.includes(params.protocolVersion) ? params.protocolVersion : '2025-06-18';
                    initialized = true;
                    result = { protocolVersion: protocol, capabilities: { tools: {} }, serverInfo: { name: options.name, version: options.version }, instructions: options.instructions };
                    break;
                }
                case 'ping':
                    result = {};
                    break;
                case 'tools/list':
                    if (!initialized)
                        throw new AppError('Initialize the connection first.');
                    result = { tools: await options.list() };
                    break;
                case 'tools/call':
                    if (!initialized)
                        throw new AppError('Initialize the connection first.');
                    if (typeof params.name !== 'string')
                        throw new AppError('Tool name is required.');
                    try {
                        result = await options.call(params.name, object(params.arguments || {}), controller.signal);
                    }
                    catch (error) {
                        result = toolText(errorText(error), true);
                    }
                    break;
                default:
                    send({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not supported.' } });
                    return;
            }
            if (!controller.signal.aborted)
                send({ jsonrpc: '2.0', id, result });
        }
        catch (error) {
            send({ jsonrpc: '2.0', id, error: { code: -32602, message: errorText(error) } });
        }
        finally {
            pending.delete(JSON.stringify(id));
            active--;
        }
    };
    input.setEncoding('utf8');
    await new Promise<void>((resolve, reject) => {
        input.on('data', (chunk: string) => {
            queue += chunk;
            if (Buffer.byteLength(queue) > 4 * 1024 * 1024) {
                input.destroy(new Error('MCP input exceeds limit.'));
                return;
            }
            let newline: number;
            while ((newline = queue.indexOf('\n')) >= 0) {
                const line = queue.slice(0, newline).trim();
                queue = queue.slice(newline + 1);
                if (line)
                    void consume(line);
            }
        });
        input.once('end', () => { for (const c of pending.values())
            c.abort(); resolve(); });
        input.once('error', reject);
    });
    await options.close?.();
}
export class RpcClient {
    private sequence = 0;
    private pending = new Map<number, {
        resolve: (x: unknown) => void;
        reject: (e: Error) => void;
        timer: NodeJS.Timeout;
    }>();
    private dead: Error | undefined;
    constructor(readonly child: ChildProcess) {
        if (!child.stdout || !child.stdin)
            throw new Error('RPC process must use pipes.');
        const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
        lines.on('line', line => {
            if (Buffer.byteLength(line) > 8 * 1024 * 1024) {
                this.close();
                return;
            }
            let msg: Record<string, unknown>;
            try {
                msg = object(JSON.parse(line));
            }
            catch {
                return;
            }
            if (typeof msg.id !== 'number')
                return;
            const current = this.pending.get(msg.id);
            if (!current)
                return;
            this.pending.delete(msg.id);
            clearTimeout(current.timer);
            if (msg.error)
                current.reject(new AppError(`Upstream MCP error: ${JSON.stringify(msg.error)}`, 502));
            else
                current.resolve(msg.result);
        });
        const fail = (error: Error) => {
            this.dead = error;
            for (const item of this.pending.values()) {
                clearTimeout(item.timer);
                item.reject(error);
            }
            this.pending.clear();
        };
        child.once('error', fail);
        child.once('exit', code => fail(new AppError(`Upstream MCP process exited (${code ?? 'unknown'}).`, 503)));
    }
    request(method: string, params: unknown = {}, timeoutMs = 60000): Promise<unknown> {
        if (this.dead)
            return Promise.reject(this.dead);
        const id = ++this.sequence;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => { this.pending.delete(id); this.notify('notifications/cancelled', { requestId: id }); reject(new AppError(`Upstream ${method} timed out.`, 504)); }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            this.child.stdin!.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', error => {
                if (error) {
                    clearTimeout(timer);
                    this.pending.delete(id);
                    reject(error);
                }
            });
        });
    }
    notify(method: string, params: unknown = {}): void { if (!this.dead)
        this.child.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); }
    async initialize(): Promise<void> {
        await this.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'context-companion', version: VERSION } });
        this.notify('notifications/initialized');
    }
    close(): void { this.child.stdin?.end(); stopChild(this.child); }
}
