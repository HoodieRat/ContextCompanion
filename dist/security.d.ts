import type { IncomingMessage } from 'node:http';
export declare function secretName(relative: string): boolean;
export declare function looksSecret(contents: Buffer): boolean;
export declare function checkedFile(root: string, relative: string): string;
export declare function privateAddress(address: string): boolean;
export declare function publicUrl(input: string): Promise<string>;
export declare function localEndpoint(input: string): string;
export declare function authenticated(req: IncomingMessage, token: string, port: number): void;
