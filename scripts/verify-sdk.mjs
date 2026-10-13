/** Exercise the real maintained SDK installed with Grounded Docs, not a test double. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { APP_ROOT, defaultHome, now, writeJson } from '../dist/util.js';
const args = process.argv.slice(2);
const option = (name, fallback = '') => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const home = path.resolve(option('--home', defaultHome()));
const project = option('--project');
const report = { at: now(), status: 'blocked', checks: [], passed: false };
let client;
try {
    if (!project)
        throw new Error('Select a registered project with --project ID. No project is guessed.');
    const sdk = path.join(home, 'runtime/docs/node_modules/@modelcontextprotocol/sdk/dist/esm/client');
    if (!fs.existsSync(path.join(sdk, 'index.js')))
        throw new Error('Grounded Docs and its official MCP SDK are not installed. Run Install.bat first.');
    const { Client } = await import(pathToFileURL(path.join(sdk, 'index.js')).href);
    const { StdioClientTransport } = await import(pathToFileURL(path.join(sdk, 'stdio.js')).href);
    client = new Client({ name: 'context-companion-sdk-verifier', version: '1.1.0' });
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(APP_ROOT, 'dist/cli.js'), 'mcp', '--home', home, '--project', project], stderr: 'pipe' });
    await client.connect(transport);
    report.status = 'running';
    const list = await client.listTools();
    if (!list.tools.some(t => t.name === 'context_search'))
        throw new Error('context_search not advertised to the SDK');
    report.checks.push('SDK initialize and tools/list');
    const value = await client.callTool({ name: 'context_project', arguments: {} });
    if (value.isError || !JSON.stringify(value).includes(project))
        throw new Error('SDK tool response was not bound to the requested project');
    report.checks.push('SDK project-bound context_project');
    const invalid = await client.callTool({ name: 'context_search', arguments: { query: 'documentation', projectId: 'wrong-project' } });
    if (!invalid.isError)
        throw new Error('Unexpected project-changing argument was not rejected');
    report.checks.push('SDK tool-error handling and project-switch rejection');
    report.passed = true;
    report.status = 'passed';
}
catch (error) {
    report.error = error.message;
    if (report.status === 'running')
        report.status = 'failed';
    process.exitCode = report.status === 'blocked' ? 2 : 1;
}
finally {
    await client?.close();
}
writeJson(path.join(home, 'verification/sdk-latest.json'), report);
console.log(JSON.stringify(report, null, 2));
