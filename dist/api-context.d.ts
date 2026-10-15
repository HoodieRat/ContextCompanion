/** Recover declared API scope for a quoted RST/Markdown passage. This reads
 * an immutable approved snapshot at retrieval time; it converts/indexes nothing.
 * Ambiguous/mixed owners yield no inferred scope. Declaration-only hits may
 * quote bounded adjacent text in the same API section, with exact offsets.
 */
export type ApiContext = {
    identifiers: string[];
    declarations: {
        text: string;
        start: number;
        end: number;
    }[];
    sourceExcerpt?: {
        start: number;
        end: number;
    };
    overview?: boolean;
};
export declare function declaredApiContext(source: string, passage: string, requestedIdentifiers?: string[]): ApiContext | undefined;
/** Exact declaration navigation within an already returned immutable file.
 * It neither crawls nor indexes: the existing scope parser must corroborate
 * one actual requested API declaration before its bounded definition is quoted.
 */
export declare function declaredApiDefinition(source: string, requestedIdentifiers: string[]): ApiContext | undefined;
