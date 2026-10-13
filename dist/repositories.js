import fs from 'node:fs';
import path from 'node:path';
import { lookup } from 'node:dns/promises';
import { cleanEnvironment, run } from './process.js';
import { AppError, ensureDir } from './util.js';
import { privateAddress, publicUrl } from './security.js';
export function gitRef(value) {
    if (!value || value.length > 160 || value.startsWith('-') || value.includes('..') || value.includes('@{') || !/^[-A-Za-z0-9_/.]+$/.test(value))
        throw new AppError('Use HEAD, an ordinary branch/tag, or a full commit hash.');
    return value;
}
export async function gitSnapshot(urlValue, refValue, destination, logFile, signal) {
    const url = new URL(await publicUrl(urlValue));
    if (url.protocol !== 'https:' || url.search || url.hash)
        throw new AppError('Git sources require public HTTPS without a query or fragment.');
    const records = await lookup(url.hostname, { all: true });
    if (records.some(r => privateAddress(r.address)) || !records[0])
        throw new AppError('Git resolved to a disallowed network.');
    const ref = gitRef(refValue);
    ensureDir(destination);
    const empty = path.join(destination, 'empty-config');
    fs.writeFileSync(empty, '');
    const hooks = path.join(destination, 'empty-hooks');
    ensureDir(hooks);
    const root = path.join(destination, 'repository');
    ensureDir(root);
    const env = cleanEnvironment({ GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: empty, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1', GIT_ASKPASS: '', GIT_SSH_COMMAND: 'false' });
    const address = records[0].family === 6 ? `[${records[0].address}]` : records[0].address;
    const config = ['-c', `core.hooksPath=${hooks}`, '-c', 'protocol.file.allow=never', '-c', 'protocol.ext.allow=never', '-c', 'http.followRedirects=false',
        '-c', `http.curloptResolve=${url.hostname}:${url.port || 443}:${address}`, '-c', 'core.longpaths=true', '-c', 'core.autocrlf=false', '-c', `core.attributesFile=${empty}`, '-c', 'filter.lfs.smudge=', '-c', 'filter.lfs.required=false'];
    const exec = (args, timeoutMs = 120000) => run('git', [...config, ...args], { cwd: root, env, signal, logFile, timeoutMs, maxOutput: 20 * 1024 * 1024 });
    await exec(['init', '--quiet']);
    await exec(['remote', 'add', 'origin', url.href]);
    await exec(['fetch', '--no-tags', '--depth=1', '--filter=blob:none', 'origin', ref], 10 * 60 * 1000);
    const commit = (await exec(['rev-parse', 'FETCH_HEAD'])).stdout.trim();
    if (!/^[0-9a-f]{40,64}$/.test(commit))
        throw new AppError('Git did not resolve an immutable commit.');
    const listing = (await exec(['ls-tree', '-rlz', commit])).stdout;
    let total = 0;
    let files = 0;
    for (const entry of listing.split('\0').filter(Boolean)) {
        const match = entry.match(/^([0-9]+)\s+(\w+)\s+([a-f0-9]+)\s+(\d+|-)\t(.+)$/s);
        if (!match)
            throw new AppError('Unexpected Git tree record.');
        if (match[1] === '160000' || match[1] === '120000')
            continue;
        total += Number(match[4]);
        files++;
        if (total > 200 * 1024 * 1024 || files > 10000)
            throw new AppError('Repository exceeds the 200 MiB / 10,000 file limit. Clone it separately and select a smaller local folder.');
    }
    // Fresh repository, empty system/global Git config and hook path: target scripts/filters are not installed or executed.
    await exec(['-c', 'core.symlinks=false', 'checkout', '--detach', '--force', commit], 10 * 60 * 1000);
    // Git on Windows materializes symlinks as text. Remove those and gitlinks explicitly before the normal scanner.
    for (const entry of listing.split('\0').filter(Boolean)) {
        const match = entry.match(/^([0-9]+)\s+\w+\s+[a-f0-9]+\s+(?:\d+|-)\t(.+)$/s);
        if (match && ['120000', '160000'].includes(match[1])) {
            const target = path.resolve(root, match[2]);
            if (target.startsWith(root + path.sep))
                fs.rmSync(target, { recursive: true, force: true });
        }
    }
    return { root, commit };
}
//# sourceMappingURL=repositories.js.map