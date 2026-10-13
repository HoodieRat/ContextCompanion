export declare function normalize(values: number[]): number[];
export declare function weightedMean(vectors: number[][], weights: number[]): number[];
export declare function windows<T>(tokens: T[], size?: number, overlap?: number): {
    values: T[];
    weight: number;
}[];
