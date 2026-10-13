import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { lookup } from 'node:dns/promises';
import crypto from 'node:crypto';
import { AppError, isWithin } from './util.js';
export function secretName(relative) {
    const name = path.basename(relative).toLowerCase();
    return name === '.env' || name.startsWith('.env.') || name === '.npmrc' || name === '.pypirc'
        || /^(credentials|secrets|auth|token|tokens)(\.|$)/i.test(name)
        || /^id_(rsa|ed25519|ecdsa|dsa)/.test(name)
        || /\.(pem|key|p12|pfx|jks|keystore|kdbx|sqlite|sqlite3|db|log)$/i.test(name);
}
export function looksSecret(contents) {
    const value = contents.toString('utf8');
    return /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/.test(value)
        || /\b(?:ghp_|gho_|github_pat_)[a-zA-Z0-9_]{20,}\b/.test(value)
        || /\bAKIA[0-9A-Z]{16}\b/.test(value)
        || /\bsk-(?:proj-)?[a-zA-Z0-9_-]{24,}\b/.test(value)
        || /(?:api[_-]?key|access[_-]?token|password|client[_-]?secret)\s*[=:]\s*["'][^"'\s${}]{12,}["']/i.test(value);
}
export function checkedFile(root, relative) {
    if (path.isAbsolute(relative) || relative.includes('\0') || relative.split(/[\\/]/).includes('..'))
        throw new AppError('A project-relative path without traversal is required.', 403);
    const candidate = path.resolve(root, relative);
    if (!isWithin(root, candidate))
        throw new AppError('Path is outside this project.', 403);
    const parts = relative.split(/[\\/]/).filter(Boolean);
    let current = root;
    for (const part of parts) {
        current = path.join(current, part);
        if (fs.lstatSync(current).isSymbolicLink())
            throw new AppError('Symbolic links are not followed.', 403);
    }
    const actual = fs.realpathSync(candidate);
    if (!isWithin(fs.realpathSync(root), actual))
        throw new AppError('Path resolves outside this project.', 403);
    if (secretName(relative) || parts.some(part => ['.git', '.codex', '.ssh', '.aws'].includes(part.toLowerCase())))
        throw new AppError('Sensitive paths cannot be read through the context bridge.', 403);
    return actual;
}
export function privateAddress(address) {
    const a = address.toLowerCase().replace(/^\[|\]$/g, '');
    if (net.isIP(a) === 4) {
        const [x = 0, y = 0] = a.split('.').map(Number);
        return x === 0 || x === 10 || x === 127 || x >= 224 || (x === 169 && y === 254)
            || (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168)
            || (x === 100 && y >= 64 && y <= 127) || (x === 198 && (y === 18 || y === 19));
    }
    if (net.isIP(a) === 6)
        return a === '::' || a === '::1' || a.startsWith('fc') || a.startsWith('fd') || /^fe[89ab]/.test(a) || a.startsWith('ff') || a.includes('ffff:');
    return true;
}
export async function publicUrl(input) {
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw new AppError('Enter a valid HTTP or HTTPS URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new AppError('Only public HTTP(S) URLs without embedded credentials are supported.');
    if ([...url.searchParams.keys()].some(key => /(?:token|secret|password|credential|api[_-]?key|signature|x-amz-)/i.test(key)))
        throw new AppError('Credential-bearing or signed source URLs are not stored. Use a public documentation URL or a reviewed local export.');
    if (url.hostname.toLowerCase() === 'localhost' || url.hostname.endsWith('.local'))
        throw new AppError('Private network sources are disabled.');
    const addresses = await lookup(url.hostname.replace(/^\[|\]$/g, ''), { all: true });
    if (!addresses.length || addresses.some(item => privateAddress(item.address)))
        throw new AppError('Private, loopback, and link-local network sources are blocked.');
    // Grounded Docs additionally checks every outgoing request/redirect; this precheck is not the sole SSRF guard.
    return url.href;
}
export function localEndpoint(input) {
    let url;
    try {
        url = new URL(input);
    }
    catch {
        throw new AppError('Invalid local embedding endpoint.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
        throw new AppError('Embedding endpoints must use localhost/127.0.0.1/::1 with no credentials or query string.');
    }
    return url.href.replace(/\/$/, '');
}
export function authenticated(req, token, port) {
    const host = req.headers.host || '';
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(host))
        throw new AppError('Invalid Host header.', 403);
    if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin))
        throw new AppError('Cross-origin requests are not permitted.', 403);
    const supplied = (req.headers.authorization || '').replace(/^Bearer /, '');
    const expected = Buffer.from(token);
    const actual = Buffer.from(supplied);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual))
        throw new AppError('Reopen the dashboard using Start.bat to authenticate.', 401);
}
//# sourceMappingURL=security.js.map