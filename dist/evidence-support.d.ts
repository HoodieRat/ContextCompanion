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
/** Unscored keyword candidates still require actual task words. Lifecycle
 * questions bind their object and condition in one passage, using the same
 * scaffold-free ranking task. This is a bounded spelling check: synonyms
 * without literal corroboration may abstain; no semantic score is invented.
 */
export declare function keywordSupport(query: string, passages: string[], task?: string, verifiedIdentifiers?: string[]): boolean;
export declare function calibratedProfile(profile?: EmbeddingProfile): boolean;
