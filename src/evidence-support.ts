/** Bounded query-level support, independent of upstream rank.
 * This is a relevance safeguard, not fact verification or general entailment.
 * Development calibration: evidence/windows-support-v2/development-calibration.json.
 */
import { supportText, topicText } from './support.js';
import type { EmbeddingProfile } from './types.js';
export const SUPPORT_PROFILE = { model: 'Xenova/all-MiniLM-L6-v2', revision: '751bff37182d3f1213fa05d7196b954e230abad9', dimensions: 384, minimumCosine: 0.20 };
// Same-passage descriptive components have a separate development-only
// calibration; whole-query resemblance cannot supply an appended object.
export const COMPONENT_MINIMUM_COSINE = 0.40;
const GENERAL = new Set(('a an the and or with this that these those for from what how why who where when which are is can could would please use using make create project code implement need want does into without should have been its there to of in on at as it me i my our your their then than do be by about after before more most any all some no not only tell explain describe give show find get run work works support supports supported operation method function call documentation document reference information question answer help together contain contains include includes including provide provides provided number count first last highest lowest average value unit measure return report has had having current latest date time rate price cost size length mass capital day today yesterday tomorrow minute hour week month year name title version result maximum minimum upper lower default defaults summarize state list outline clarify indicate identify specify determine check inspect understand query will shall may might must was were am being next session sessions steps tasks finish complete continue remains done').split(' '));
const stem = (word: string) => word.replace(/ies$/, 'y').replace(/s$/, '').replace(/(?:ed|ing)$/, '').replace(/e$/, '');
export function topicTerms(text: string): string[] {
    return [...new Set((supportText(text).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) || []).filter(term => !GENERAL.has(term) && !GENERAL.has(stem(term))).map(stem))];
}
export function literalSupport(query: string, passages: string[]): boolean {
    const topics = topicTerms(query);
    // An open request like "What should the next session do?" has no domain
    // spelling obligation. Do not interpret generic words as named entities.
    return !topics.length || passages.some(passage => {
        const body = new Set(topicTerms(passage));
        const overlap = topics.filter(topic => body.has(topic)).length;
        // One incidental shared noun cannot establish a multi-topic request.
        // Unanchored paraphrases still get the pinned-model comparison below.
        return overlap >= Math.min(2, topics.length);
    });
}
/** Unscored keyword candidates still require actual task words. Lifecycle
 * questions bind their object and condition in one passage, using the same
 * scaffold-free ranking task. This is a bounded spelling check: synonyms
 * without literal corroboration may abstain; no semantic score is invented.
 */
export function keywordSupport(query: string, passages: string[], task = query, verifiedIdentifiers: string[] = []): boolean {
    // A separately corroborated declaration can prove a namespace/member that
    // the returned member paragraph omits. Do not demand that spelling again;
    // all remaining task terms still require their own literal support.
    for (const identifier of [...verifiedIdentifiers].sort((a, b) => b.length - a.length)) task = task.replaceAll(identifier, ' ');
    if (!/^what\s+happens\s+(?:to|when|after|if|unless|until)\b/i.test(query.trim()))
        return literalSupport(task, passages.map(topicText));
    const topics = topicTerms(task);
    return topics.length > 0 && passages.some(passage => {
        const body = new Set(topicTerms(topicText(passage)));
        return topics.every(topic => body.has(topic));
    });
}
export function calibratedProfile(profile?: EmbeddingProfile): boolean {
    return profile?.kind === 'local' && profile.model === SUPPORT_PROFILE.model && profile.revision === SUPPORT_PROFILE.revision && profile.dimensions === SUPPORT_PROFILE.dimensions;
}
