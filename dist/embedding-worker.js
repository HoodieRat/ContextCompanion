import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import { AppError, defaultHome, ensureDir, errorText, object, text } from './util.js';
import { normalize, weightedMean, windows } from './embedding-math.js';
import { EmbeddingQueue } from './embedding-queue.js';
const args = process.argv.slice(2);
const get = (flag, fallback = '') => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] || fallback : fallback; };
const home = get('--home', defaultHome());
const model = get('--model', 'Xenova/all-MiniLM-L6-v2');
const revision = get('--revision');
const token = process.env.CC_EMBED_TOKEN || '';
if (!/^[a-f0-9]{40}$/.test(revision) || !token)
    throw new Error('Embedding worker requires an immutable model revision and local access token.');
const modulePath = path.join(home, 'runtime', 'embeddings', 'node_modules', '@huggingface', 'transformers', 'dist', 'transformers.node.mjs');
if (!fs.existsSync(modulePath))
    throw new Error('Local embedding runtime is missing. Run Install.bat to repair it.');
let extractor;
let loading;
let state = 'idle';
let lastError = '';
async function load() {
    if (extractor)
        return extractor;
    if (!loading)
        loading = (async () => {
            state = 'loading';
            const library = await import(pathToFileURL(modulePath).href);
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
const queue = new EmbeddingQueue();
async function embed(input) {
    const pipeline = await load();
    let tokens = 0;
    const vectors = [];
    for (const item of input) {
        const ids = Array.from(pipeline.tokenizer(item, { truncation: false, add_special_tokens: false }).input_ids.data, Number);
        if (!ids.length)
            throw new AppError('Embedding input must contain tokens.');
        if (ids.length > 12000)
            throw new AppError('Embedding input exceeds 12,000 tokens. Reduce the document chunk size.');
        tokens += ids.length;
        const chunks = windows(ids);
        const values = [];
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
    const send = (status, value) => { res.writeHead(status); res.end(JSON.stringify(value)); };
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
    if (req.method === 'GET' && (req.url === '/v1/models' || req.url === '/query/v1/models')) {
        send(200, { object: 'list', data: [{ id: model, object: 'model', owned_by: 'local' }] });
        return;
    }
    if (req.method !== 'POST' || !['/v1/embeddings', '/query/v1/embeddings'].includes(req.url || '')) {
        send(404, { error: { message: 'Not found.' } });
        return;
    }
    try {
        const chunks = [];
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
        const result = await queue.run(() => embed(input), req.url === '/query/v1/embeddings', () => res.destroyed);
        send(200, { object: 'list', model, data: result.vectors.map((embedding, index) => ({ object: 'embedding', index, embedding })), usage: { prompt_tokens: result.tokens, total_tokens: result.tokens } });
    }
    catch (error) {
        if (!res.destroyed)
            send(error instanceof AppError ? error.status : 500, { error: { message: errorText(error) } });
    }
});
server.requestTimeout = 300000;
server.headersTimeout = 10000;
server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (address && typeof address === 'object')
        process.stdout.write(JSON.stringify({ port: address.port }) + '\n');
    // A connection was requested for this approved pinned model. Overlap its
    // initialization with Grounded's startup instead of waiting for the first
    // HTTP embedding request on the short interactive deadline.
    void load().catch(error => process.stderr.write(`Embedding warmup failed: ${errorText(error)}\n`));
});
for (const signal of ['SIGTERM', 'SIGINT'])
    process.on(signal, () => { server.close(); setTimeout(() => process.exit(0), 1000).unref(); });
//# sourceMappingURL=embedding-worker.js.map