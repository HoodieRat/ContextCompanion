/** Match Grounded's Markdown spelling without modifying quoted evidence.
 * Preserve ordinary code regions; this is not a Markdown conversion engine.
 */
export declare function supportText(text: string): string;
export declare function requiredIdentifiers(query: string): string[];
export declare function missingIdentifiers(query: string, evidence: string[], bindings?: string[][]): string[];
export declare function secretValueRequest(query: string): boolean;
export declare const UNANCHORED_SUPPORT: {
    model: string;
    revision: string;
    dimensions: number;
    minimumCosine: number;
};
/** Explicit grammatical referents need their own returned support. This is a
 * bounded spelling check, not general named-entity recognition or entailment.
 * Compatibility declarations may support language/platform qualifiers only.
 */
export declare function missingNamedSubjects(query: string, evidence: string[], compatibility?: string[]): string[];
export declare function topicText(text: string): string;
/** A one-topic keyword request needs that actual spelling in returned text.
 * Do not invent entity names by splitting a longer CamelCase name here.
 */
export declare function hasLiteralTopicSupport(query: string, text: string): boolean;
type Attribute = {
    name: string;
    ask: RegExp;
    marker: RegExp;
};
export declare function requestPlan(query: string): {
    attributes: Attribute[];
    subjects: string[];
    semanticSubjects: string[];
    semanticContexts: Record<string, string>;
};
/** A bounded communication description can corroborate a delivery paraphrase.
 * Require the payload, transfer and requested waiting/storage behavior in one
 * short paragraph; neither a modifier nor an embedding score supplies a noun.
 * This is intentionally not a general entailment or synonym service.
 */
export declare function communicationSupport(component: string, context: string, evidence: string): boolean | undefined;
/** A complete definition can use the bounded transfer/behavior proof directly.
 * No additional owner, field, predicate or component may borrow that proof.
 * Production uses this only in the existing calibrated automatic path.
 */
export declare function communicationDefinitionSupport(query: string, evidence: string): boolean;
/** A code anchor cannot supply an unrelated requested operation. Match only
 * this bounded do-support form; preserve quotations and existing score floors.
 * Intent verbs are scaffolding, while their actual objects remain required.
 */
export declare function operationSupportsRequest(query: string, evidence: string): boolean;
/** Explicit API conditions must occur in this passage. Similarity or an API
 * name cannot certify an unrelated event. This bounded lexical guard keeps
 * punctuation spelling and negative conditions; it is not general entailment.
 */
export declare function conditionSupportsRequest(query: string, evidence: string): boolean;
/** A leading runtime qualifier is bound to an eligible library declaration.
 * It cannot supply API names, fields, conditions or bypass version filters.
 */
export declare function runtimeQualifier(query: string): {
    library: string;
    task: string;
} | undefined;
/** All requested referents and fields must be corroborated by one actual
 * passage. Source labels cannot supply a field, nor can another hit lend it.
 * Actual compatibility declarations may corroborate language/platform only.
 */
export declare function passageSupportsRequest(query: string, text: string, compatibility?: string[], verifiedSemanticSubjects?: string[], apiBindings?: string[]): boolean;
export declare function missingSemanticSubjects(query: string, text: string, compatibility?: string[]): string[];
export declare function missingPropertySubjects(query: string, evidence: string[], compatibility?: string[]): string[];
/** The documented exclusive renewable lease/lock relationship is an input
 * alias for the existing model. It is not a new boolean answerability gate.
 */
export declare function semanticSupportText(text: string): string;
export declare function hasTopicSupport(query: string, evidence: string[], _metadata?: string[], allowSemanticAlias?: boolean): boolean;
/** Eight bounded scoring windows cover short facts and both ends. Select
 * windows by query overlap when supplied, then fill from uniform coverage.
 * Unselected text can still be missed; scores are not entailment guarantees.
 */
export declare function semanticSupportWindows(text: string, query?: string): string[];
/** Quote adjacent sentence context around a verified unit. Scoring stays on
 * the unit; this only displays its original conditions instead of a fragment.
 */
export declare function returnedSpanContext(text: string, start: number, end: number): {
    text: string;
    start: number;
    end: number;
};
/** Exact offsets into already returned text; never read or ingest new files. */
export declare function semanticSupportSpans(text: string, query?: string): {
    text: string;
    start: number;
    end: number;
}[];
export {};
