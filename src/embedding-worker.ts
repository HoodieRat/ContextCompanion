import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import { AppError, defaultHome, ensureDir, errorText, object, text } from './util.js';
import { normalize, weightedMean, windows } from './embedding-math.js';
const args = process.argv.slice(2);
const get = (flag: string, fallback = '') => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] || fallback : fallback; };
const home = get('--home', defaultHome());
const model = get('--model', 'Xenova/all-MiniLM-L6-v2');
const revision = get('--revision');
const token = process.env.CC_EMBED_TOKEN || '';
if (!/^[a-f0-9]{40}$/.test(revision) || !token)
    throw new Error('Embedding worker requires an immutable model revision and local access token.');
const modulePath = path.join(home, 'runtime', 'embeddings', 'node_modules', '@huggingface', 'transformers', 'dist', 'transformers.node.mjs');
if (!fs.existsSync(modulePath))
    throw new Error('Local embedding runtime is missing. Run Install.bat to repair it.');
// This adapter is intentionally isolated: the core has no ONNX/Transformers dependency.
type Tensor = {
    data: ArrayLike<number | bigint>;
    tolist: () => number[][];
};
type Extractor = ((value: string, options: Record<string, unknown>) => Promise<Tensor>) & {
    tokenizer: ((value: string, options: Record<string, unknown>) => {
        input_ids: Tensor;
    }) & {
        decode: (tokens: number[], options: Record<string, unknown>) => string;
    };
};
let extractor: Extractor | undefined;
let loading: Promise<Extractor> | undefined;
let state = 'idle';
let lastError = '';
async function load(): Promise<Extractor> {
    if (extractor)
        return extractor;
    if (!loading)
        loading = (async () => {
            state = 'loading';
            const library = await import(pathToFileURL(modulePath).href) as {
                env: {
                    cacheDir: string;
                    allowRemoteModels: boolean;
                    backends: {
                        onnx: {
                            wasm: {
                                numThreads: number;
                            };
                        };
                    };
                };
                pipeline: (task: string, name: string, config: Record<string, unknown>) => Promise<Extractor>;
            };
            ensureDir(path.join(home, 'models'));
            library.env.cacheDir = path.join(home, 'models');
            library.env.allowRemoteModels = process.env.CC_EMBED_OFFLINE !== '1';
            library.env.backends.onnx.wasm.numThreads = 2;
            extractor = await library.pipeline('feature-extraction', model, { revision, local_files_only: process.env.CC_EMBED_OFFLINE === '1', dtype: 'q8', device: 'cpu', session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } });
            state = 'ready';
            lastError = '';
            return extractor;
        })().catch(error => { loading = undefined; state = 'error'; lastError = errorText(error); throw error; });
    return loading;
}
let queue: Promise<void> = Promise.resolve();
let outstanding = 0;
async function embed(input: string[]): Promise<{
    vectors: number[][];
    tokens: number;
}> {
    const pipeline = await load();
    let tokens = 0;
    const vectors: number[][] = [];
    for (const item of input) {
        const ids = Array.from(pipeline.tokenizer(item, { truncation: false, add_special_tokens: false }).input_ids.data, Number);
        if (!ids.length)
            throw new AppError('Embedding input must contain tokens.');
        if (ids.length > 12000)
            throw new AppError('Embedding input exceeds 12,000 tokens. Reduce the document chunk size.');
        tokens += ids.length;
        const chunks = windows(ids);
        const values: number[][] = [];
        for (const chunk of chunks) {
            const value = pipeline.tokenizer.decode(chunk.values, { skip_special_tokens: true });
            const tensor = await pipeline(value, { pooling: 'mean', normalize: true });
            const vector = normalize(Array.from(tensor.data, Number));
            if (vector.length !== 384)
                throw new AppError(`Expected 384 embedding dimensions, received ${vector.length}.`, 502);
            values.push(vector);
        }
        vectors.push(weightedMean(values, chunks.map(c => c.weight)));
    }
    return { vectors, tokens };
}
const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    const send = (status: number, value: unknown) => { res.writeHead(status); res.end(JSON.stringify(value)); };
    const address = server.address();
    const port = address && typeof address === 'object' ? address.port : 0;
    if (req.headers.host !== `127.0.0.1:${port}` || req.headers.origin || req.headers.authorization !== `Bearer ${token}`) {
        send(403, { error: { message: 'Access denied.' } });
        return;
    }
    if (req.method === 'GET' && req.url === '/health') {
        send(200, { state, model, revision, dimensions: 384, error: lastError });
        return;
    }
    if (req.method === 'GET' && req.url === '/v1/models') {
        send(200, { object: 'list', data: [{ id: model, object: 'model', owned_by: 'local' }] });
        return;
    }
    if (req.method !== 'POST' || req.url !== '/v1/embeddings') {
        send(404, { error: { message: 'Not found.' } });
        return;
    }
    try {
        if (outstanding >= 16)
            throw new AppError('Embedding queue is full. Retry shortly.', 429);
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of req) {
            const b = Buffer.from(chunk);
            length += b.length;
            if (length > 2 * 1024 * 1024)
                throw new AppError('Request exceeds 2 MiB.', 413);
            chunks.push(b);
        }
        const body = object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        if (body.model !== model)
            throw new AppError(`Model identity mismatch. Expected ${model}.`);
        if (body.encoding_format && body.encoding_format !== 'float')
            throw new AppError('Only float encoding is supported.');
        if (body.dimensions !== undefined && body.dimensions !== 384)
            throw new AppError('This model produces exactly 384 dimensions.');
        const input = (Array.isArray(body.input) ? body.input : [body.input]).map(x => text(x, 'embedding input', 100000));
        if (!input.length || input.length > 64)
            throw new AppError('Supply between 1 and 64 input strings.');
        outstanding++;
        const work = queue.then(() => embed(input));
        queue = work.then(() => undefined, () => undefined);
        try {
            const result = await work;
            send(200, { object: 'list', model, data: result.vectors.map((embedding, index) => ({ object: 'embedding', index, embedding })), usage: { prompt_tokens: result.tokens, total_tokens: result.tokens } });
        }
        finally {
            outstanding--;
        }
    }
    catch (error) {
        send(error instanceof AppError ? error.status : 500, { error: { message: errorText(error) } });
    }
});
server.requestTimeout = 300000;
server.headersTimeout = 10000;
server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object')
        process.stdout.write(JSON.stringify({ port: address.port }) + '\n');
});
for (const signal of ['SIGTERM', 'SIGINT'] as const)
    process.on(signal, () => { server.close(); setTimeout(() => process.exit(0), 1000).unref(); });
