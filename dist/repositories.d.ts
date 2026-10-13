export declare function gitRef(value: string): string;
export declare function gitSnapshot(urlValue: string, refValue: string, destination: string, logFile: string, signal: AbortSignal): Promise<{
    root: string;
    commit: string;
}>;
