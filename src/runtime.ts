import fs from 'node:fs';
import path from 'node:path';
import { isWithin, readJson } from './util.js';
export function managedPython(home: string): string {
    try {
        const i = readJson<{
            python?: string;
        }>(path.join(home, 'installation.json'));
        if (i.python && isWithin(home, i.python) && fs.existsSync(i.python))
            return i.python;
    }
    catch { /* Standard location remains available before the first completed install. */ }
    return path.join(home, 'runtime', 'serena', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
}
