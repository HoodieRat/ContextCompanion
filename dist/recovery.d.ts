import { Store } from './state.js';
type BackupFile = {
    path: string;
    sha256: string;
    bytes: number;
};
type BackupManifest = {
    format: 1;
    id: string;
    createdAt: string;
    home: string;
    registryRevision: number;
    files: BackupFile[];
    checksum: string;
};
export declare function createBackup(store: Store): Promise<BackupManifest>;
export declare function inspectBackup(home: string, backupId: string): BackupManifest;
export declare function listBackups(home: string): Record<string, unknown>[];
export declare function restoreBackup(home: string, backupId: string): Record<string, unknown>;
export {};
