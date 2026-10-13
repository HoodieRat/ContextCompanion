/** Inspect Grounded Docs' own SQLite databases; never introduce a parallel index. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const [command, home, storeRoot] = process.argv.slice(2);
if (command !== 'inspect' || !home || !storeRoot)
    throw new Error('Usage: db-tools.mjs inspect HOME STORE_DIRECTORY');
const require = createRequire(path.join(home, 'runtime', 'docs', 'package.json'));
const Database = require('better-sqlite3');
const vec = require('sqlite-vec');
const quote = value => '"' + value.replace(/"/g, '""') + '"';
const candidates = [];
function walk(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.isSymbolicLink())
            throw new Error('Symlink in database directory');
        const file = path.join(dir, item.name);
        if (item.isDirectory())
            walk(file);
        else if (/\.(?:db|sqlite|sqlite3)$/.test(item.name))
            candidates.push(file);
    }
}
walk(storeRoot);
if (!candidates.length)
    throw new Error('No SQLite database was produced by Grounded Docs.');
let ftsCount = 0;
const reports = [];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-integrity-'));
try {
    for (const [index, file] of candidates.entries()) {
        const db = new Database(file, { readonly: true, fileMustExist: true });
        vec.load(db);
        let copy;
        try {
            const journal = db.pragma('journal_mode', { simple: true });
            if (['off', 'memory'].includes(String(journal).toLowerCase()))
                throw new Error('Unsafe SQLite journal mode: ' + journal);
            const check = db.pragma('integrity_check');
            if (!check.every(row => Object.values(row)[0] === 'ok'))
                throw new Error('SQLite integrity check failed: ' + JSON.stringify(check));
            const foreign = db.pragma('foreign_key_check');
            if (foreign.length)
                throw new Error('Foreign-key violations: ' + JSON.stringify(foreign.slice(0, 5)));
            const copyPath = path.join(temp, index + '.db');
            await db.backup(copyPath);
            copy = new Database(copyPath);
            vec.load(copy);
            const schema = copy.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND sql IS NOT NULL").all();
            const fts = schema.filter(r => /\bUSING\s+fts5\s*\(/i.test(r.sql));
            ftsCount += fts.length;
            const ftsReports = [];
            for (const table of fts) {
                const q = quote(table.name);
                copy.prepare(`INSERT INTO ${q} (${q}, rank) VALUES ('integrity-check', 1)`).run();
                const contentTable = table.sql.match(/\bcontent\s*=\s*['"]([\w]+)['"]/i)?.[1];
                let mutation = 'not_applicable';
                if (contentTable) {
                    const column = copy.prepare(`PRAGMA table_info(${quote(contentTable)})`).all().find(c => ['content', 'text', 'body'].includes(c.name));
                    const row = copy.prepare(`SELECT rowid AS cc_rowid FROM ${quote(contentTable)} LIMIT 1`).get();
                    if (row && column) {
                        copy.exec('BEGIN IMMEDIATE');
                        try {
                            copy.prepare(`UPDATE ${quote(contentTable)} SET ${quote(column.name)}=? WHERE rowid=?`).run('CCFTSINTEGRITY948761', row.cc_rowid);
                            const changed = copy.prepare(`SELECT rowid FROM ${q} WHERE ${q} MATCH ?`).all('CCFTSINTEGRITY948761');
                            if (!changed.length)
                                throw new Error('FTS update synchronization is broken: ' + table.name);
                            copy.prepare(`DELETE FROM ${quote(contentTable)} WHERE rowid=?`).run(row.cc_rowid);
                            copy.prepare(`INSERT INTO ${q} (${q}, rank) VALUES ('integrity-check', 1)`).run();
                            mutation = 'update_delete_rollback_passed';
                        }
                        finally {
                            copy.exec('ROLLBACK');
                        }
                        copy.prepare(`INSERT INTO ${q} (${q}, rank) VALUES ('integrity-check', 1)`).run();
                    }
                }
                ftsReports.push({ table: table.name, integrity: 'passed', mutation });
            }
            const triggers = copy.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().map(r => r.name);
            const pages = [];
            for (const table of schema.filter(t => t.name === 'pages')) {
                const cols = copy.prepare(`PRAGMA table_info(${quote(table.name)})`).all().map(r => r.name);
                if (cols.includes('url'))
                    pages.push(...copy.prepare(`SELECT url FROM ${quote(table.name)} LIMIT 20000`).all().map(r => r.url));
            }
            reports.push({ file: path.relative(storeRoot, file), journal, integrity: 'passed', foreignKeys: 'passed', userVersion: db.pragma('user_version', { simple: true }), fts: ftsReports, triggers, pages });
        }
        finally {
            copy?.close();
            db.close();
        }
    }
}
finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
if (!ftsCount)
    throw new Error('No FTS5 index was found; indexing is not verified.');
console.log(JSON.stringify({ passed: true, checkedAt: new Date().toISOString(), databases: reports }));
