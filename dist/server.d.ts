import http from 'node:http';
import { Service } from './service.js';
import type { RuntimeRecord } from './types.js';
export declare function bodyJson(req: http.IncomingMessage): Promise<unknown>;
export declare function startServer(home: string, port?: number): Promise<{
    server: http.Server;
    service: Service;
    record: RuntimeRecord;
    close: () => Promise<void>;
}>;
