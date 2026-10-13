import path from 'node:path';
import fs from 'node:fs';
import { run } from './process.js';
import { AppError, errorText, now } from './util.js';
export function resolveCheck(check) {
    if (['node', 'node.exe'].includes(check.command.toLowerCase()))
        return { command: process.execPath, args: check.args };
    if (['npm', 'npm.cmd', 'npx', 'npx.cmd'].includes(check.command.toLowerCase())) {
        const name = check.command.startsWith('npx') ? 'npx-cli.js' : 'npm-cli.js';
        const candidates = [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', name), path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', name)];
        const cli = candidates.find(f => fs.existsSync(f));
        if (!cli)
            throw new AppError('npm CLI was not found alongside Node. Use its absolute npm-cli.js path with command node.');
        return { command: process.execPath, args: [cli, ...check.args] };
    }
    if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(check.command))
        throw new AppError('For batch-file checks, use powershell.exe with -NoProfile -File and a reviewed wrapper script. Shell command strings are not executed.');
    return { command: check.command, args: check.args };
}
export async function runChecks(project, logFile, signal) {
    if (!project.checks.length)
        throw new AppError('No quality checks are configured. Add reviewed commands in the project Quality tab; no tests have been claimed as passed.');
    const results = [];
    for (const check of project.checks) {
        if (signal.aborted)
            throw new AppError('Quality checks cancelled.', 499);
        fs.appendFileSync(logFile, `\n=== ${check.name} | ${now()} ===\n${JSON.stringify([check.command, ...check.args])}\n`);
        try {
            const invocation = resolveCheck(check);
            await run(invocation.command, invocation.args, { cwd: project.root, logFile, timeoutMs: check.timeoutSeconds * 1000, signal, maxOutput: 32 * 1024 * 1024 });
            results.push({ name: check.name, passed: true });
        }
        catch (error) {
            results.push({ name: check.name, passed: false, error: errorText(error) });
        }
    }
    fs.appendFileSync(logFile, '\nRESULTS\n' + JSON.stringify(results, null, 2) + '\n');
    const failed = results.filter(r => !r.passed);
    if (failed.length)
        throw new AppError(`${failed.length}/${results.length} quality checks failed: ${failed.map(r => r.name).join(', ')}. Read the saved job log.`, 422);
    return `${results.length}/${results.length} configured checks passed. This is not a guarantee of production correctness.`;
}
//# sourceMappingURL=checks.js.map