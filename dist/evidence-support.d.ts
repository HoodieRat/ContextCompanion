import type { EmbeddingProfile } from './types.js';
export declare const SUPPORT_PROFILE: {
    model: string;
    revision: string;
    dimensions: number;
    minimumCosine: number;
};
export declare const COMPONENT_MINIMUM_COSINE = 0.4;
export declare function topicTerms(text: string): string[];
export declare function literalSupport(query: string, passages: string[]): boolean;
export declare function calibratedProfile(profile?: EmbeddingProfile): boolean;
