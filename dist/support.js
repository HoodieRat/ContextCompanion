/** Query support checks over returned evidence, never an ingestion engine.
 * These checks cannot establish general natural-language entailment.
 */
const ESCAPE = /[.*+?^${}()|[\]\\]/g;
/** Match Grounded's Markdown spelling without modifying quoted evidence.
 * Preserve ordinary code regions; this is not a Markdown conversion engine.
 */
export function supportText(text) {
    const regions = /(`{3,}[\s\S]*?`{3,}|~{3,}[\s\S]*?~{3,}|`+[^`\n]*`+|(?:^|\n)(?: {4}|\t)[^\n]*)/g;
    return text.split(regions).map((part, index) => index % 2 ? part : part.replace(/\\(.)/g, (escaped, character) => {
        const n = character.charCodeAt(0);
        return (n >= 33 && n <= 47) || (n >= 58 && n <= 64) || (n >= 91 && n <= 96) || (n >= 123 && n <= 126) ? character : escaped;
    })).join('');
}
function contains(text, value) {
    const boundary = value.startsWith('--') ? '[\\p{L}\\p{N}_-]' : '[\\p{L}\\p{N}_]';
    return new RegExp(`(?<!${boundary})${value.replace(ESCAPE, '\\$&')}(?!${boundary})`, 'u').test(text);
}
function namedApiMembers(query) {
    return [...query.matchAll(/\b([A-Za-z_]\w*(?:(?:\.|::)[A-Za-z_]\w*)*(?:\.|::)[A-Z]\w*)\s+([a-z_]\w*)\s+(?=(?:raises?|returns?|throws?|exceeds?|increases?|decreases?|blocks?|waits?|is\s+called)\b)/g)]
        .map(match => ({ raw: match[0].trim(), identifier: match[1] + '.' + match[2] }));
}
export function requiredIdentifiers(query) {
    const identifiers = (query.match(/\b[A-Za-z_][A-Za-z0-9_]*(?:(?:\.|::)[A-Za-z_][A-Za-z0-9_]*)*\b/g) || [])
        .filter(t => /[._]|::/.test(t) || /[a-z0-9][A-Z]/.test(t) || /^[A-Z][A-Z0-9]*_[A-Z0-9_]+$/.test(t));
    const calls = [...query.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map(m => m[1]).filter(call => !identifiers.some(t => t.endsWith('.' + call) || t.endsWith('::' + call)));
    const options = query.match(/--[A-Za-z][A-Za-z0-9_-]*/g) || [];
    const quoted = [...query.matchAll(/`([^`\n]{2,100})`/g)].map(m => m[1]);
    return [...new Set([...identifiers, ...calls, ...options, ...quoted, ...namedApiMembers(query).map(m => m.identifier)])].filter(t => t.length <= 100);
}
export function missingIdentifiers(query, evidence, bindings = []) {
    const normalized = evidence.map(supportText);
    return requiredIdentifiers(query).filter(identifier => !normalized.some((text, index) => {
        if (contains(text, identifier))
            return true;
        if (bindings[index]?.includes(identifier))
            return true;
        // Documentation may separate a namespace/class and its member. Each
        // component must still appear in the same returned passage.
        const components = identifier.split(/\.|::/);
        return components.length > 1 && !bindings[index]?.length && components.every(component => contains(text, component));
    }));
}
export function secretValueRequest(query) {
    const target = /\b(?:passwords?|credentials?|secrets?|(?:api|authentication|access|production|database)[ _-]*(?:key|token)|(?:private|confidential|secret)[\w\s-]{0,30}canary(?: value)?)\b/i;
    if (!target.test(query))
        return false;
    const actual = /\b(?:actual|real|live|active|current|production|private|confidential)\b/i.test(query);
    const request = /\b(?:give|reveal|show|print|expose|return|extract|send|supply|retrieve|fetch|list|disclose|tell me|what (?:is|are))\b/i.test(query);
    if (!request)
        return false;
    // Guidance words cannot launder an explicit request for a real value.
    const guidance = /\b(?:store|stored|storage|hashing|rotate|rotation|redact|protect|secure|prevent|example|placeholder|dummy|policy|procedure|definition)\b/i.test(query)
        || /\bwhat (?:is|are) (?:an?|the concept of)\b/i.test(query);
    const extraction = /\b(?:reveal|print|expose|extract|send|supply|retrieve|fetch|list|disclose)\b/i.test(query);
    if (actual && (extraction || !guidance || /\b(?:actual|real)\b/i.test(query)))
        return true;
    return !guidance;
}
// Selected using only independent development cases. Similarities are not
// probabilities; this fallback is not calibrated for other model identities.
export const UNANCHORED_SUPPORT = { model: 'Xenova/all-MiniLM-L6-v2', revision: '751bff37182d3f1213fa05d7196b954e230abad9', dimensions: 384, minimumCosine: 0.26 };
const GENERIC = new Set(('a an the and or with this that for from what how why who where when which are is can could would please use using make create project code implement need want does into without should have been its there to of in on at as it me i my our your their then than do be by about after before more most any all some no not only tell explain describe give show find get run work works support supports supported operation method function call documentation document reference information question answer help together').split(' '));
for (const term of ['contain', 'contains', 'include', 'includes', 'including', 'provide', 'provides', 'provided'])
    GENERIC.add(term);
// Routine report/count/value words alone do not establish the requested topic.
// Their semantic relevance is still checked by the existing model; the words
// are not removed from the actual upstream query or returned quotations.
for (const term of ['number', 'count', 'first', 'last', 'highest', 'lowest', 'average', 'value', 'unit', 'measure', 'return', 'report'])
    GENERIC.add(term);
for (const term of ['has', 'had', 'having'])
    GENERIC.add(term);
// Administrative descriptors are shared across unrelated domains. They may
// participate in the upstream query, but cannot alone establish its subject.
for (const term of ['current', 'latest', 'date', 'time', 'rate', 'price', 'cost', 'size', 'length', 'mass', 'capital', 'day', 'today', 'yesterday', 'tomorrow', 'minute', 'hour', 'week', 'month', 'year', 'name', 'title', 'version', 'result'])
    GENERIC.add(term);
for (const term of ['maximum', 'minimum', 'upper', 'lower'])
    GENERIC.add(term);
for (const term of ['default', 'defaults'])
    GENERIC.add(term);
for (const term of ['summarize', 'state', 'list', 'outline', 'clarify', 'indicate', 'identify', 'specify', 'determine', 'check', 'inspect', 'understand', 'query'])
    GENERIC.add(term);
for (const term of ['will', 'shall', 'may', 'might', 'must', 'was', 'were', 'am', 'being', 'been'])
    GENERIC.add(term);
/** Explicit grammatical referents need their own returned support. This is a
 * bounded spelling check, not general named-entity recognition or entailment.
 * Compatibility declarations may support language/platform qualifiers only.
 */
export function missingNamedSubjects(query, evidence, compatibility = []) {
    const head = query.match(/^(?:(?:how|why|when|where|what)\s+)?(?:does|do|did)\s+([\p{L}\p{N}_-]+)\b/iu)?.[1];
    return requestPlan(query).subjects.filter(subject => !evidence.some(text => subjectPresent(subject, text, compatibility)
        // A scope exclusion still names its grammatical subject; it does not
        // corroborate the excluded object or a requested factual property.
        || (head === subject && contains(supportText(text).toLowerCase(), subject.toLowerCase()))));
}
export function topicText(text) {
    // A declaration that a reference does not cover a subject cannot itself
    // supply positive topical support. Keep actual negative behavior rules
    // (for example, no retries for permanent errors) and quoted evidence intact.
    return supportText(text)
        .replace(/(?:^|(?<=[.!?\n;]))[^.!?\n;]*\b(?:has|contains|provides|documents|includes|covers|discusses)\s+no\b[^.!?\n;]*/gi, '')
        .replace(/(?:^|(?<=[.!?\n;]))[^.!?\n;]*\bdoes\s+not\s+(?:cover|document|contain|provide|discuss|describe)\b[^.!?\n;]*/gi, '');
}
function terms(text) {
    return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) || []).filter(t => !GENERIC.has(t) && !GENERIC.has(t.replace(/s$/, ''))))];
}
/** A one-topic keyword request needs that actual spelling in returned text.
 * Do not invent entity names by splitting a longer CamelCase name here.
 */
export function hasLiteralTopicSupport(query, text) {
    const topics = terms(normalize(query));
    return topics.length === 1 && contains(topicText(text).toLowerCase(), topics[0]);
}
/** Factual slots and grammatical referents are separate from code identifiers.
 * Ordinary verbs/adverbs and capitalization never become spelling obligations.
 * This is a bounded request parser, not general entailment or entity recognition.
 */
const GRAMMAR = new Set('a an the its it they them this that these those our your my his her their me i we us is are was were am be been being can could should would will shall may might must do does did how what which who why when where please show tell explain describe find get use using for to and or with at as by of on in from about after before until between only more most any all some no not current default latest maximum minimum first last next new deepest'.split(' '));
for (const word of ['each', 'every', 'several', 'both', 'another', 'one', 'multiple'])
    GRAMMAR.add(word);
const CONTEXT_REFERENTS = new Set('data record records entry entries output result results file files artifact artifacts call calls request requests response responses cache caches buffer buffers parameter parameters option options operation operations lock locks work'.split(' '));
// Generic software actor roles are contextual noun heads, not proper names.
// This ontology is independent of question verbs, modifiers and capitalization.
for (const role of ['client', 'worker', 'consumer', 'subscriber', 'caller', 'user', 'owner', 'operator', 'processor']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
// Conversation/interface roles describe the supplied context and response,
// rather than introducing named document subjects.
for (const role of ['context', 'evidence', 'source', 'reference', 'turn', 'tool', 'command', 'instruction', 'answer']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
// Contextual resources and behavior concepts are not literal entity names.
// They still need topical or same-profile semantic support in Retrieval.
for (const role of ['session', 'connection', 'channel', 'task', 'job', 'message', 'event', 'stream', 'queue', 'receipt', 'cursor', 'checkpoint', 'handler', 'service', 'server', 'endpoint', 'repository', 'application', 'program', 'object', 'array', 'string', 'pool', 'step', 'value']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
for (const role of ['resource', 'subscription', 'observable', 'observer', 'scheduler', 'emission', 'producer', 'publisher', 'coroutine', 'promise', 'future', 'thread', 'listener', 'signal', 'notification', 'callback', 'evaluation', 'calculation', 'delivery', 'processing']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
for (const role of ['function', 'method', 'procedure', 'workflow', 'computation', 'composition', 'transformation', 'sequence', 'flow', 'pipeline', 'chain', 'behavior', 'effect', 'state']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
for (const resource of ['copy', 'copies', 'backup', 'backups', 'snapshot', 'snapshots'])
    CONTEXT_REFERENTS.add(resource);
// Contextual workflow nouns describe the supplied application, rather than
// introducing a named external subject. Factual fields stay independently
// required, and a noncontextual modifier still binds its own literal owner.
for (const role of ['project', 'interface', 'index', 'storage', 'group', 'submission', 'purpose', 'objective', 'outcome', 'boundary', 'separation']) {
    CONTEXT_REFERENTS.add(role);
    CONTEXT_REFERENTS.add(role + 's');
}
const DESCRIPTIVE = new Set('eager lazy higher lower earlier later faster slower deeper deepest outer inner other nested side only requested idle fresh reusable independent asynchronous synchronous early'.split(' '));
for (const word of ['previous', 'prior', 'successful', 'failed', 'live', 'active', 'desired', 'planned', 'intended'])
    DESCRIPTIVE.add(word);
const descriptiveWord = (word) => DESCRIPTIVE.has(word.toLowerCase()) || word.split('-').some(part => DESCRIPTIVE.has(part.toLowerCase()) || /(?:ed|ing)$/i.test(part) || /^(?:driven|bound|built|made|grown|drawn)$/i.test(part));
const BEHAVIOR_REFERENTS = new Set('buffering batching scheduling streaming concurrency parallelism cancellation blocking waiting polling ordering order sequential concurrent parallel nonblocking non-blocking eager lazy'.split(' '));
function contextualActorModifier(head, tail) {
    const modifier = (word) => descriptiveWord(word) || /^(?:old|stale|lost)$/i.test(word);
    if (!modifier(head))
        return false;
    const words = (tail.match(/[\p{L}\p{N}_-]+/gu) || []).slice(0, 4);
    // Bound the adjective to an actual contextual noun head. A following action
    // ("Stale processes records") must not erase the named actor. Ambiguous
    // action nouns stay on their existing literal/semantic path.
    const role = words.findIndex(word => CONTEXT_REFERENTS.has(word.toLowerCase()) && !/^(?:work|call|value|state|flow)$/i.test(word));
    return role >= 0 && words.slice(0, role).every(modifier);
}
/** Recognize complete, contextual agenda requests, never prefix matches that
 * can lend a handoff's directive to an additional owner or unsupported goal.
 */
function agendaRequest(query) {
    const text = supportText(query).trim().replace(/[?.!]+$/, '');
    const agendaWords = new Set('session sessions work task tasks activity activities step steps objective plan agenda priorities continuation next following later subsequent another current first finish continue do address undertake pick up carry forward into focus resume prioritize tackle handle need needs happen done remains remember know summarize outline fresh last successful verified result results check checks action actions carried'.split(' '));
    // A finite grammar allows alternate word order in an open session agenda.
    // Every token must be grammatical or an agenda role/action; an additional
    // domain, owner or goal cannot be dropped from the request to gain support.
    const completeSessionAgenda = /^(?:what|which|summarize|outline|describe)\b/i.test(text)
        && /\b(?:next|following|later|subsequent|another|fresh)\s+session\b/i.test(text)
        && (text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []).every(word => GRAMMAR.has(word) || agendaWords.has(word));
    if (completeSessionAgenda)
        return true;
    return [
        /^(?:what|which)(?:\s+(?:work|tasks?|activity|activities|steps?))?\s+(?:should|will|would|can)\s+(?:(?:a|an|the|our|my)\s+)?(?:next|following|later|subsequent|another)\s+session\s+(?:work(?:\s+on)?|finish|continue|do|address|undertake|pick\s+up|carry\s+forward|focus\s+on|resume|prioritize|tackle|handle)(?:\s+next)?$/i,
        /^(?:what|which)(?:\s+(?:work|tasks?|steps?))?\s+(?:should|can|will)\s+we\s+(?:do|finish|continue|work\s+on)\s+next$/i,
        /^what\s+(?:work\s+)?remains(?:\s+to\s+be\s+done)?$/i,
        /^what\s+(?:comes\s+next|should\s+happen\s+next|should\s+we\s+tackle\s+next|next)$/i,
        /^what\s+(?:is\s+next|are\s+the\s+next\s+steps(?:\s+for\s+this\s+project)?)$/i,
        /^what\s+(?:does\s+the\s+next\s+session\s+need\s+to\s+do|needs\s+to\s+happen\s+next)$/i,
        /^what\s+is\s+(?:the\s+plan|planned)\s+for\s+the\s+next\s+session$/i,
        /^(?:summarize|outline|describe)\s+(?:the\s+)?(?:current\s+objective\s+and\s+)?next\s+steps$/i
    ].some(pattern => pattern.test(text));
}
const ATTRIBUTES = [
    { name: 'size', ask: /\b(?:size|capacity|allocation)\b|\bhow big\b/i, marker: /\b(?:size|capacity|allocation|width|bytes?)\b/i },
    { name: 'length', ask: /\b(?:length|characters?|chars?)\b/i, marker: /\b(?:length|characters?|chars?|bytes?)\b/i },
    { name: 'name', ask: /\b(?:name|named|called|filename|label)\b/i, marker: /\b(?:names?|named|called|filename|labels?)\b/i },
    { name: 'version', ask: /\b(?:version|revision|release)\b/i, marker: /\b(?:versions?|revisions?|releases?)\b/i },
    { name: 'value', ask: /\b(?:value|return|returns|returned)\b/i, marker: /\b(?:values?|returns?|returned)\b/i },
    { name: 'count', ask: /\b(?:count|number)\b|\bhow many\b/i, marker: /\b(?:count|number|entries|records?|items?|characters?)\b/i },
    { name: 'time', ask: /\b(?:time|timeout|duration|delay|deadline|expiry|expire|expires|expiration|lifetime|ttl|interval)\b|\bhow long\b/i, marker: /\b(?:time|timeout|duration|delay|deadline|seconds?|minutes?|milliseconds?|expiry|expires?|lifetime|ttl|interval)\b/i },
    { name: 'date', ask: /\b(?:date|day|today|calendar)\b/i, marker: /\b(?:dates?|days?|calendar|timestamp)\b/i },
    { name: 'rate', ask: /\b(?:rate|cadence|frequency|often)\b/i, marker: /\b(?:rate|cadence|interval)\b/i },
    { name: 'price', ask: /\b(?:price|cost)\b/i, marker: /\b(?:price|priced|cost)\b/i }
];
function normalize(text) {
    return supportText(text).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/[’‘]/g, "'").replace(/\b(what|it|that|there|which)'s\b/gi, '$1 is').replace(/\btime\s+to\s+live\b/gi, 'lifetime').toLowerCase();
}
function fieldModifier(word) {
    return ATTRIBUTES.some(attribute => attribute.marker.test(normalize(word)))
        || (word.length > 3 && /(?:ed|ing)$/i.test(word));
}
export function requestPlan(query) {
    // A sentence-start response formatter is not a requested return-value field.
    // Remove only its verb; all other fields, identities and security checks stay.
    let fieldIntent = query;
    // An event in a lifecycle condition is not a requested factual field.
    // Keep the object (including any explicit field) before that condition;
    // complete request/support checks still receive the original condition.
    fieldIntent = fieldIntent.replace(/^(what\s+happens(?:\s+to\s+.*?)?)\s+(?:when|after|if|unless|until)\b[\s\S]*$/i, '$1');
    // A named API member followed by its behavior is not a requested software
    // release/version. Identity checks keep the complete owner/member binding.
    for (const member of namedApiMembers(query))
        fieldIntent = fieldIntent.replace(member.raw, member.identifier);
    for (const identifier of requiredIdentifiers(fieldIntent))
        fieldIntent = fieldIntent.replaceAll(identifier, ' ');
    const intent = normalize(fieldIntent)
        .replace(/(^|[?.!;\n])(\s*(?:please\s+)?)return(?=\s+(?:only|just)\b)/gi, '$1$2')
        // Release is also a transitive action. An auxiliary-governed or coordinated
        // verb followed by its object does not request a software version. Keep
        // noun uses and every other requested field in the same sentence.
        .replace(/(\b(?:and|or)(?:\s+then)?\s+|\b(?:can|could|should|would|will|does|do|did)\s+(?:(?:a|an|the)\s+)?[\p{L}\p{N}_-]+\s+(?:[\p{L}]+ly\s+)?)release(?=\s+(?:a|an|the|this|that|these|those|it|them|its|our|your)\b)/giu, '$1');
    const attributes = ATTRIBUTES.filter(attribute => attribute.ask.test(intent));
    // An explicit purpose of the supplied project/application is a factual
    // slot. A nearby operational report cannot replace its objective merely
    // because the model scores it similarly. Owners remain independently bound.
    const projectPurpose = /\b(?:what|which)\s+(?:is|are)\s+(?:(?:the|its|our|desired|planned|intended|current)\s+)*(?:purpose|objective|outcome|goal)\s+(?:of|for)\s+(?:(?:a|an|the|this|our|current)\s+)*(?:project|application|program)\b/i;
    if (projectPurpose.test(intent))
        attributes.push({ name: 'purpose', ask: projectPurpose, marker: /\b(?:purpose|objective|mission|goal)\b|\bintended\s+outcome\b/i });
    // A simple future-session agenda question requests the handoff's plan.
    // Bind it to an actual directive, not a label or a broad semantic alias.
    // Additional goals/predicates deliberately leave this bounded intent and
    // continue through ordinary support checks; they cannot borrow the plan.
    if (agendaRequest(query))
        attributes.push({ name: 'plan', ask: /$^/, marker: /\bhandoff\b[^.!?\n]{0,160}\b(?:says?\s+to|next\s+steps?|finish|complete|continue|resume)\b/i });
    if (agendaRequest(query) && /\b(?:verified|successful)\s+(?:result|check)\b/i.test(query))
        attributes.push({ name: 'verification', ask: /$^/, marker: /\b(?:last|prior|previous)\s+(?:verified|successful)\s+(?:result|check)\b/i });
    if (agendaRequest(query))
        return { attributes, subjects: [], semanticSubjects: [], semanticContexts: {} };
    const identity = supportText(query).replace(/[’‘]/g, "'").replace(/\b(what|it|that|there|which)'s\b/gi, '$1 is');
    // Unknown factual fields still need actual evidence; a known entity cannot
    // turn a request for an absent temperature into a version or size answer.
    if (!attributes.length) {
        const slot = identity.match(/\b(?:what|which)\s+(?:is|are)\s+(?:(?:the|its|our|current|default|latest|maximum|minimum)\s+)*([\p{L}\p{N}_-]+)(?:\s+(?:of|for|in|on)\b|[?.!]*$)/iu);
        if (slot && !BEHAVIOR_REFERENTS.has(slot[1].toLowerCase()) && !/^(?:purpose|benefit)$/i.test(slot[1]))
            attributes.push({ name: slot[1].toLowerCase(), ask: /$^/, marker: new RegExp('\\b' + slot[1].replace(ESCAPE, '\\$&') + '\\b', 'i') });
    }
    const subjects = [], semanticSubjects = [], semanticContexts = {};
    const add = (phrase, behaviorClause = false, semanticClause = false, descriptor = '') => {
        // A passive action following a noun phrase is its predicate, not another
        // descriptive object. Retain the noun/owner before parsing coordination.
        if (!attributes.length)
            phrase = phrase.replace(/\s+(?:be|been|being)\b.*$/i, '');
        if (semanticClause && !attributes.length && /\s+(?:and|or|with|versus)\s+/i.test(phrase)) {
            for (const part of phrase.split(/\s+(?:and|or|with|versus)\s+/i))
                add(part, behaviorClause, true, descriptor);
            return;
        }
        let words = phrase.split(',')[0].trim().split(/\s+/);
        // A numeric version annotation qualifies the owner; it is not part of
        // that owner's name. The requested version field and compatibility
        // filtering retain their separate checks.
        const qualifier = words.findIndex((word, index) => /^(?:version|revision|release)$/i.test(word) && /^v?\d/i.test(words[index + 1] || ''));
        if (qualifier > 0)
            words = words.slice(0, qualifier);
        // End the noun phrase before a relative/behavior clause, before stripping
        // grammatical words. Do not require the exact spelling of that behavior.
        const end = words.findIndex(w => /^(?:does|do|have|has|is|are|alive|active|from|when|while|then)$/i.test(w) || (!attributes.length && /^(?:before|after|until|without|achieved|implemented|performed|handled|composed|structured|managed)$/i.test(w)));
        if (end >= 0)
            words = words.slice(0, end);
        if (['how', 'what', 'which'].includes(words[0]?.toLowerCase() || ''))
            return;
        words = words.filter(w => !GRAMMAR.has(w.toLowerCase()));
        // An adverb before a gerund qualifies the behavior. Keep its actual object
        // so "directly modifying magnetic fields" still requires magnetic fields.
        if (!attributes.length && words.length > 1 && /ly$/i.test(words[0]) && /ing$/i.test(words[1]))
            words = words.slice(1);
        if (!attributes.length && behaviorClause && words.length === 1 && /(?:ed|ing)$/i.test(words[0]))
            return;
        // A gerund introduces an activity, not a multiword proper name. Preserve
        // its noncontextual object so unknown domains cannot borrow that activity.
        if (!attributes.length && words.length > 1 && /ing$/i.test(words[0]))
            words = words.slice(1);
        if (!attributes.length && words.length === 1 && BEHAVIOR_REFERENTS.has(words[0].toLowerCase()))
            return;
        if (!attributes.length && words.length === 1 && DESCRIPTIVE.has(words[0].toLowerCase()))
            return;
        if (!attributes.length && words.length === 1 && /^(?:purpose|benefit|difference)$/i.test(words[0]))
            return;
        if (!words.length || CONTEXT_REFERENTS.has(words[0].toLowerCase()))
            return;
        // A domain/owner modifier is not an interchangeable behavior adjective.
        // Keep its literal obligation, even if the noun's meaning is compared.
        if (semanticClause && words.length > 1 && !descriptiveWord(words[0]) && !BEHAVIOR_REFERENTS.has(words[0].toLowerCase()))
            subjects.push(words[0]);
        const context = words.findIndex(word => CONTEXT_REFERENTS.has(word.toLowerCase()));
        if (context > 0 && words.slice(0, context).every(word => descriptiveWord(word) || BEHAVIOR_REFERENTS.has(word.toLowerCase())))
            return;
        // A named modifier still owns a contextual resource (Saturn side effects).
        if (context > 0 && !semanticClause) {
            words = words.slice(0, context).filter(word => !descriptiveWord(word));
            if (!words.length)
                return;
        }
        const subject = words.join(' ');
        subjects.push(subject);
        if (semanticClause && !attributes.length) {
            semanticSubjects.push(subject);
            semanticContexts[subject] = (descriptor ? descriptor + ' ' : '') + subject;
        }
    };
    // Quantified questions and attributive field questions can omit an
    // auxiliary entirely. Their noun head still belongs to the requested fact;
    // a record count cannot answer a planet count just because both ask a number.
    const quantified = identity.match(/^how\s+many\s+([^?.!;]+)/i);
    if (quantified) {
        const words = quantified[1].split(/\s+/).filter(word => !GRAMMAR.has(word.toLowerCase()));
        const contextualParticiple = words[0] && words[0].length > 4 && /(?:ed|ing)$/i.test(words[0]) && CONTEXT_REFERENTS.has(words[1]?.toLowerCase() || '');
        if (!contextualParticiple && words[0])
            add(words[0]);
    }
    const fieldQuestion = identity.replace(/^what\s+happens\s+to\s+/i, 'what ').match(/^(?:what|which)\s+([^?.!;]+)/i);
    if (fieldQuestion && attributes.length) {
        const words = fieldQuestion[1].split(/\s+/), field = words.findIndex(word => ATTRIBUTES.some(attribute => attribute.ask.test(normalize(word))));
        if (field > 0) {
            const head = words.slice(0, field).find(word => !GRAMMAR.has(word.toLowerCase()) && !fieldModifier(word))?.match(/^[\p{L}\p{N}_-]+/u)?.[0];
            if (head)
                add(head);
        }
    }
    for (const m of identity.matchAll(/\b(?:of|about|in|on|for|by|supports?|measures?|keep)\s+([^?.!;]+)/gi))
        add(m[1], /^(?:of|for|by|keep)\b/i.test(m[0]), !attributes.length && m[1].trim().split(/\s+/).length >= 3 && /\b\p{L}+(?:ed|ing)\b/iu.test(m[1]));
    // A source/location noun after "from" retains its own evidence. A bare
    // gerund in "prevent ... from expiring" is a behavior clause, not a place.
    for (const m of identity.matchAll(/\bfrom\s+([^?.!;]+)/gi))
        if (attributes.length || !/^(?:being\s+)?\p{L}+(?:ed|ing)(?:\s+(?:\p{L}+ly|early|late|soon|now|again))*\s*$/iu.test(m[1].trim()))
            add(m[1], /^being\b/i.test(m[1].trim()));
    // Each side of an explicit comparison retains its own referent. A known
    // behavior cannot lend evidence to an unrelated second comparison object.
    if (!attributes.length) {
        const comparison = identity.match(/\bdifference\s+between\s+([^?.!;]+)/i)?.[1] || identity.match(/^(?:compare|contrast)\s+([^?.!;]+)/i)?.[1];
        if (comparison)
            for (const part of comparison.split(/\s+(?:and|with|versus|vs\.?|to)\s+/i))
                add(part);
    }
    // Temporal behavior clauses stay semantic; factual temporal owners still
    // require their own evidence (for example, a date before an earthquake).
    if (attributes.length)
        for (const m of identity.matchAll(/\b(?:before|until|between)\s+([^?.!;]+)/gi))
            add(m[1]);
    // Copular duration and entity/count questions also have explicit referents.
    for (const m of identity.matchAll(/\bhow\s+long\s+is\s+(.+?)\s+(?:valid|allowed|active|alive)\b/gi))
        add(m[1]);
    // Possessives explicitly bind a field to their owner. Case is irrelevant.
    for (const m of identity.matchAll(/\b([\p{L}\p{N}_-]+)'s\b/gu))
        add(m[1]);
    // Do-support questions have a grammatical subject before the action.
    // Determiners/pronouns designate a generic or contextual role, not a name.
    const subject = (!attributes.length ? identity.match(/\b(?:does|do|did)\s+([\p{L}\p{N}_-]+)\b/iu) : null)
        || identity.match(/^(?:who|where)\s+(?:is|was|are|were)\s+([\p{L}\p{N}_-]+)\b/iu)
        || identity.match(/^(?:can|could|should|would)\s+([\p{L}\p{N}_-]+)\s+(?:clients?|workers?|consumers?|subscribers?|callers?|users?)\b/iu);
    if (subject && !GRAMMAR.has(subject[1].toLowerCase()) && !contextualActorModifier(subject[1], identity.slice(subject.index + subject[0].length)))
        add(subject[1]);
    const copula = identity.match(/^(?:what|which|how|why|where|who)\s+(?:is|are|was|were)\s+([^?.!;]+)/i);
    if (copula) {
        const progressive = /^(?:[\p{L}]+ly\s+)?[\p{L}]+ing\s+(?:a|an|the|its|this|that|our|your)\b/iu.test(copula[1]);
        const head = copula[1].split(/\s+/).find(word => !GRAMMAR.has(word.toLowerCase()))?.match(/^[\p{L}\p{N}_-]+/u)?.[0];
        // An adjective/participle modifies a following contextual noun in a
        // definition. It is not a named owner. Unknown objects remain strict.
        const rest = head ? copula[1].slice(copula[1].indexOf(head) + head.length).trim() : '';
        const descriptive = !attributes.length && head && rest && !/^(?:used|using|available|valid|allowed|active|alive|capable)\b/i.test(rest)
            && (BEHAVIOR_REFERENTS.has(head.toLowerCase()) || descriptiveWord(head));
        if (descriptive)
            add(rest, false, true, head);
        if (head && !progressive && !descriptive && !GENERIC.has(head.toLowerCase()) && !ATTRIBUTES.some(attribute => attribute.ask.test(head)) && (!attributes.length || !fieldModifier(head)))
            add(head);
    }
    const modal = identity.match(/\b(?:can|could|would|will|should)\s+([\p{L}\p{N}_-]+)\b([^?.!;]*)/iu), actor = modal?.[1];
    // Passive/copular state questions leave their descriptive noun phrase to
    // semantic comparison; its leading adjective is not an entity spelling.
    const barePluralActor = actor && /[^s]s$/i.test(actor) && !/(?:is|us)$/i.test(actor);
    // Bare plural behavioral subjects describe a class of events/actors. Keep
    // their paraphrases in semantic comparison instead of demanding verbatim
    // spelling (replays versus replayed operations). Factual slot owners and
    // explicit code identities retain their separate strict checks.
    if (!attributes.length && actor && !barePluralActor && !GRAMMAR.has(actor.toLowerCase()) && !CONTEXT_REFERENTS.has(actor.toLowerCase()) && !contextualActorModifier(actor, modal?.[2] || '')
        && !/^(?:some|any|every|no)(?:one|body|thing)$/i.test(actor) && !/\b(?:be|been|being)\b/i.test(modal?.[2] || ''))
        add(actor);
    if (attributes.length) {
        for (const match of identity.matchAll(/\b(?:does|do|did|can|could|would|will|is|are|was|were)\s+([^?.!;]+)/gi)) {
            // A contextual noun immediately before a copula is already its subject
            // ("the operation is available"). The following predicate is not a new
            // owner. Inverted factual questions retain their post-auxiliary owner.
            const preceding = identity.slice(0, match.index).trim().match(/([\p{L}\p{N}_-]+)$/u)?.[1];
            if (/^(?:is|are|was|were)\b/i.test(match[0]) && (CONTEXT_REFERENTS.has(preceding?.toLowerCase() || '') || /^(?:there|it|they|this|that)$/i.test(preceding || '')))
                continue;
            if (/^(?:it|its|this|that|they|them|we|i|you|there)\b/i.test(match[1]))
                continue;
            const words = match[1].split(/\s+/).filter(word => !GRAMMAR.has(word.toLowerCase()));
            // A contextual software role may be modified or followed by an action;
            // neither turns its adjective/verb into a name. Otherwise the grammatical
            // head must have its own evidence, including an embedded count subject.
            if (CONTEXT_REFERENTS.has(words[0]?.toLowerCase() || ''))
                continue;
            if (words[0] && words[0].length > 4 && /(?:ed|ing)$/i.test(words[0]) && CONTEXT_REFERENTS.has(words[1]?.toLowerCase() || ''))
                continue;
            const head = words[0]?.match(/^[\p{L}\p{N}_-]+/u)?.[0];
            if (head && !fieldModifier(head))
                add(head);
        }
    }
    const argument = identity.match(/^(?:explain|describe|summarize|outline|clarify|tell\s+me|give\s+me|show\s+me|find)\s+(.+)/i);
    if (argument) {
        const head = argument[1].split(/\s+/).find(word => !GRAMMAR.has(word.toLowerCase()))?.match(/^[\p{L}\p{N}_-]+/u)?.[0];
        if (head && !ATTRIBUTES.some(attribute => attribute.ask.test(head)))
            add(!attributes.length && /ing$/i.test(head) && argument[1].trim().split(/\s+/).length > 1 ? argument[1] : head);
    }
    // A direct object is a reference, not the pronoun/role of the caller. Keep
    // ordinary indefinite descriptions semantic; do not infer an external API
    // or language merely from words in its requested operation.
    for (const match of identity.matchAll(/\b(?:use|uses|using|create|construct|call)\s+([^?.!;]+)/gi)) {
        // These spellings can also be nouns ("a call wait"). A determiner binds
        // that noun; it does not introduce a verb's direct object.
        if (/\b(?:a|an|the|any|each|this|that|what|which|whose)\s*$/i.test(identity.slice(0, match.index)))
            continue;
        if (/^(?:a|an|it|this|that|them)\b/i.test(match[1]))
            continue;
        const words = match[1].split(/\s+/).filter(word => !GRAMMAR.has(word.toLowerCase()));
        if (words[0] && words[0].length > 3 && /(?:ed|ing)$/i.test(words[0]) && CONTEXT_REFERENTS.has(words[1]?.toLowerCase() || ''))
            continue;
        const head = words[0]?.match(/^[\p{L}\p{N}_-]+/u)?.[0];
        if (head && !GENERIC.has(head.toLowerCase()) && !ATTRIBUTES.some(attribute => attribute.ask.test(head)))
            add(!attributes.length && /ing$/i.test(head) && match[1].trim().split(/\s+/).length > 1 ? match[1] : head);
    }
    // These transformations have a direct target even when their actor is a
    // contextual software role. An actor cannot lend support to another domain.
    for (const match of identity.matchAll(/\b(?:reverse|control|alter|change|manipulate|regulate|reconfigure)\s+([^?.!;]+)/gi))
        add(match[1]);
    // A short noun-phrase topic has no auxiliary to expose its domain modifier.
    // Keep that modifier literal while ordinary behavior descriptors/contextual
    // resources retain their existing semantic support path.
    const topic = identity.trim().match(/^([\p{L}\p{N}_-]+)\s+([\p{L}\p{N}_-]+)(?:\s+[\p{L}\p{N}_-]+)*[?.!]*$/u);
    if (topic && !/^(?:compare|contrast|keep|prevent|compose|combine|defer|retry|release|cancel)$/i.test(topic[1]) && !GENERIC.has(topic[1].toLowerCase()) && !GRAMMAR.has(topic[1].toLowerCase()) && !CONTEXT_REFERENTS.has(topic[1].toLowerCase()) && !descriptiveWord(topic[1]))
        add(topic[1]);
    // A coordinated property clause must retain the earlier behavioral request.
    // Parsing the full string as a single property query would drop its semantic
    // object. Both clauses still require support in the same returned passage.
    const clauses = identity.split(/\s+and\s+(?=(?:current|default|maximum|minimum|latest|report|measure|state|give|show|return)\b)/i);
    if (clauses.length > 1)
        for (const clause of clauses) {
            const child = requestPlan(clause);
            subjects.push(...child.subjects);
            semanticSubjects.push(...child.semanticSubjects);
            Object.assign(semanticContexts, child.semanticContexts);
            for (const attribute of child.attributes)
                if (!attributes.some(other => other.name === attribute.name))
                    attributes.push(attribute);
        }
    return { attributes, subjects: [...new Set(subjects)], semanticSubjects: [...new Set(semanticSubjects)], semanticContexts };
}
function subjectPresent(subject, text, compatibility) {
    const positive = topicText(text).toLowerCase(), name = subject.toLowerCase();
    // CamelCase/snake_case splitting belongs to field matching. It must never
    // invent a distinct entity (Java from JavaScript, or Cedar from CedarCache).
    return contains(positive, name)
        || (name.length > 3 && !name.includes(' ') && /[^aeiou]y$/.test(name) && contains(positive, name.slice(0, -1) + 'ies'))
        || (name.length > 4 && !name.includes(' ') && name.endsWith('ies') && contains(positive, name.slice(0, -3) + 'y'))
        || (name.length > 4 && !name.includes(' ') && contains(positive, name.replace(/s$/, '')))
        || (name.length > 4 && !name.includes(' ') && contains(positive, name + 's'))
        || compatibility.some(value => value.toLowerCase() === name);
}
/** A bounded communication description can corroborate a delivery paraphrase.
 * Require the payload, transfer and requested waiting/storage behavior in one
 * short paragraph; neither a modifier nor an embedding score supplies a noun.
 * This is intentionally not a general entailment or synonym service.
 */
export function communicationSupport(component, context, evidence) {
    // General communication/dispatch questions describe the same documented
    // payload transfer. They do not need their noun repeated verbatim when the
    // existing bounded behavior proof establishes it in the returned paragraph.
    const transferTopics = new Set(['delivery', 'transmission', 'transfer', 'transport', 'distribution', 'dissemination', 'forwarding', 'conveyance', 'propagation', 'communication', 'dispatch']);
    if (!transferTopics.has(component.toLowerCase()))
        return undefined;
    const modifier = context.slice(0, -component.length).trim().toLowerCase();
    const behavior = /^(?:delayed|deferred|postponed|queued|buffered|staged)$/.exec(modifier)?.[0];
    if (!behavior)
        return undefined;
    return topicText(evidence).split(/\n\s*\n/).some(paragraph => {
        if (paragraph.length > 600)
            return false;
        // Reactive documentation describes communication as emitted items/values,
        // not only sent messages. These are data payloads and transfer spellings;
        // the same paragraph must still establish the requested storage/wait rule.
        const payload = /\b(?:messages?|signals?|packets?|notes?|parcels?|items?|values?|events?|notifications?)\b/i;
        const transfer = /\b(?:deliver(?:y|s|ed|ing)?|send(?:s|ing)?|sent|hand(?:s|ed|ing)?|giv(?:e|es|ing)|forward(?:s|ed|ing)?|transfer(?:s|red|ring)?|distribut(?:e|es|ed|ing|ion)|emit(?:s|ted|ting)?|emissions?)\b/i;
        const stored = /\b(?:queues?|buffer(?:s|ed|ing)?|accumulat(?:e|es|ed|ing)|collect(?:s|ed|ing)?|memory|staging|holds?|keeps?)\b/i;
        const delayed = /\b(?:wait(?:s|ed|ing)?|delay(?:s|ed|ing)?|postpon(?:e|es|ed|ing)|withheld|withhold(?:s|ing)?|until|pending)\b/i;
        if (!payload.test(paragraph) || !transfer.test(paragraph))
            return false;
        if (/\b(?:no|not|never|without)\s+(?:a\s+|any\s+)?(?:queue|buffer|waiting|delay|staging|memory)/i.test(paragraph))
            return false;
        const denied = paragraph.match(/\b(?:not|never|cannot|can't)\b[^.!?\n]{0,50}\b(?:deliver|send|hand|give|forward|transfer|distribut|emit|emission)[^.!?\n]*/i)?.[0];
        if (denied && !/\buntil\b/i.test(denied))
            return false;
        // Queuing may be described as retained payloads awaiting release without
        // using the noun "queue". Storage alone (such as periodic buffering) still
        // cannot establish it; explicit denials above remain decisive.
        return behavior === 'queued' ? (/\bqueues?\b/i.test(paragraph) || (stored.test(paragraph) && delayed.test(paragraph))) : behavior === 'buffered' || behavior === 'staged' ? stored.test(paragraph) : delayed.test(paragraph);
    });
}
/** A complete definition can use the bounded transfer/behavior proof directly.
 * No additional owner, field, predicate or component may borrow that proof.
 * Production uses this only in the existing calibrated automatic path.
 */
export function communicationDefinitionSupport(query, evidence) {
    const text = normalize(query).trim();
    if (!/^what\s+is\s+/i.test(text))
        return false;
    const definition = text.replace(/^what\s+is\s+(?:(?:a|an|the)\s+)?/i, '').replace(/[?.!]+$/, '').trim();
    const plan = requestPlan(query), component = plan.semanticSubjects[0];
    if (!component || plan.attributes.length || plan.subjects.length !== 1 || plan.semanticSubjects.length !== 1 || plan.subjects[0] !== component)
        return false;
    const context = plan.semanticContexts[component] || component;
    return definition === context && communicationSupport(component, context, evidence) === true;
}
/** A code anchor cannot supply an unrelated requested operation. Match only
 * this bounded do-support form; preserve quotations and existing score floors.
 * Intent verbs are scaffolding, while their actual objects remain required.
 */
export function operationSupportsRequest(query, evidence) {
    if (!/^how\s+(?:does|do|did)\s+/i.test(query.trim()))
        return true;
    const identifiers = requiredIdentifiers(query);
    const anchor = identifiers.find(identifier => new RegExp('\\b' + identifier.replace(ESCAPE, '\\$&') + '\\s+[a-z]+\\b', 'i').test(query));
    if (!anchor)
        return true;
    const tail = query.match(new RegExp('\\b' + anchor.replace(ESCAPE, '\\$&') + '\\s+([a-z]+)\\s*([^?!;]*)', 'i'));
    if (!tail)
        return true;
    const intentVerbs = new Set('use enable implement perform provide produce select choose configure check validate compute calculate handle manage process support work do'.split(' '));
    const stem = (word) => word.toLowerCase().replace(/ion$/, '').replace(/(?:ance|ence)$/, '').replace(/ing$/, '').replace(/ed$/, '').replace(/(?<!s)s$/, '').replace(/e$/, '');
    const verb = tail[1].toLowerCase();
    const goals = (normalize(tail[2]).match(/[\p{L}\p{N}_-]+/gu) || [])
        .filter(word => !GRAMMAR.has(word) && !GENERIC.has(word) && !CONTEXT_REFERENTS.has(word));
    if (!intentVerbs.has(verb))
        goals.unshift(verb);
    if (!goals.length)
        return true;
    const body = new Set((normalize(topicText(evidence)).match(/[\p{L}\p{N}_-]+/gu) || []).map(stem));
    return goals.every(word => body.has(stem(word)));
}
/** Bounded affirmative operation requests must not borrow an incidental noun,
 * a separate action/condition or an explicit denial. Polar/why questions can
 * legitimately retrieve denials and retain the existing support path.
 * This spelling contract covers causative instructions and actor questions;
 * it is not a general natural-language entailment claim.
 */
export function assertedOperationSupport(query, evidence) {
    const operation = 'download|install|launch|upload|export|import|encrypt|decrypt|delete|send|collect|keep|retain|start|stop|refresh|run|poll|execute';
    const causative = query.trim().match(new RegExp('^how\\s+(?:do|can|could|should)\\s+(?:i|we|you)\\s+make\\s+(.+?)\\s+((?:automatically\\s+)?(?:' + operation + '))\\s+([^?!;]+)', 'i'));
    const actor = query.trim().match(new RegExp('^(?:what|which)\\s+(.+?)\\s+((?:' + operation + ')s?)\\s+([^?!;]+)', 'i'));
    // Generic API-discovery questions retain their existing declaration and
    // semantic support path. The actor check binds an explicitly requested
    // condition/state to its behavior, rather than demanding verb spelling for
    // every "which operation" question.
    const request = causative || (actor && /\b(?:while|when|if|unless|until)\b/i.test(actor[3]) ? actor : null);
    if (!request)
        return true;
    const stem = (word) => word.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '').replace(/(?:ed|ing)$/, '').replace(/e$/, '');
    const tokens = (text) => (normalize(text).match(/[\p{L}\p{N}_-]+/gu) || []).filter(w => !GRAMMAR.has(w) && !GENERIC.has(w)).map(stem);
    const goals = tokens(request.slice(1).join(' '));
    return topicText(evidence).split(/\n|(?<=[.!?;])\s+/).some(sentence => {
        // An until/without qualification can document a legitimate restriction,
        // but cannot prove an affirmative operation in this bounded request form.
        if (/\b(?:no|not|never|cannot|can't|doesn't|don't|won't|isn't|aren't|without)\b/i.test(sentence))
            return false;
        const body = new Set(tokens(sentence));
        return goals.every(goal => body.has(goal));
    });
}
/** Explicit API conditions must occur in this passage. Similarity or an API
 * name cannot certify an unrelated event. This bounded lexical guard keeps
 * punctuation spelling and negative conditions; it is not general entailment.
 */
export function conditionSupportsRequest(query, evidence) {
    const anchors = requiredIdentifiers(query).map(id => ({ id, at: query.indexOf(id) })).filter(a => a.at >= 0);
    if (!anchors.length)
        return true;
    const last = anchors.sort((a, b) => b.at - a.at)[0];
    const tail = query.slice(last.at + last.id.length);
    const conditions = [...tail.matchAll(/\b(?:when|if|unless)\s+([^?;]+)/gi)].map(m => m[1]);
    const stem = (word) => word.replace(/(?:ing|ed)$/, '').replace(/s$/, '').replace(/e$/, '');
    const body = topicText(evidence), bodyWords = new Set((normalize(body).match(/[\p{L}\p{N}_-]+/gu) || []).map(stem));
    return conditions.every(condition => {
        const state = normalize(condition).replace(/\s+/g, ' ').trim();
        const emptyRequest = /^(?:empty|it is empty|(?:(?:there (?:is|are)|it (?:has|contains)) )?no (?:items|elements|entries|records)(?: (?:are )?(?:present|available|remaining|left))?)$/.test(state);
        if (emptyRequest) {
            // Occupancy paraphrases retain the complete bounded predicate. An added
            // domain/modifier (encrypted items, network packets) cannot disappear.
            return body.split(/\n\s*\n/).some(paragraph => {
                const text = normalize(paragraph).replace(/\s+/g, ' ');
                const empty = /\b(?:is|are|was|were|becomes?|be|if|when) empty\b/.test(text) && !/\b(?:not|never) (?:\w+ )?empty\b/.test(text);
                return empty || /\bno (?:items|elements|entries|records) (?:are )?(?:present|available|remaining|left)\b/.test(text);
            });
        }
        const goals = (normalize(condition).match(/[\p{L}\p{N}_-]+/gu) || []).filter(word => !GRAMMAR.has(word) && !GENERIC.has(word) && !CONTEXT_REFERENTS.has(word));
        if (!goals.every(word => bodyWords.has(stem(word)) || (word === 'dot' && /`+\.`+/.test(body))))
            return false;
        if (/\b(?:no|not|without|never)\b/i.test(condition))
            return body.split(/\n\s*\n/).some(paragraph => /\b(?:no|not|without|never)\b/i.test(paragraph) && goals.every(word => contains(normalize(paragraph), word) || (word === 'dot' && /`+\.`+/.test(paragraph))));
        return true;
    });
}
/** A leading runtime qualifier is bound to an eligible library declaration.
 * It cannot supply API names, fields, conditions or bypass version filters.
 */
export function runtimeQualifier(query) {
    const match = query.match(/^in\s+([A-Za-z][\w-]*)\.js,\s+(.+)$/i);
    return match ? { library: match[1].toLowerCase(), task: match[2] } : undefined;
}
/** All requested referents and fields must be corroborated by one actual
 * passage. Source labels cannot supply a field, nor can another hit lend it.
 * Actual compatibility declarations may corroborate language/platform only.
 */
export function passageSupportsRequest(query, text, compatibility = [], verifiedSemanticSubjects = [], apiBindings = []) {
    const plan = requestPlan(query);
    return assertedOperationSupport(query, text) && operationSupportsRequest(query, text) && conditionSupportsRequest(query, text) && plan.subjects.every(subject => subjectPresent(subject, text, compatibility) || apiBindings.some(binding => binding.split(/\.|::/).some(part => part.toLowerCase() === subject.toLowerCase())) || (plan.semanticSubjects.includes(subject) && verifiedSemanticSubjects.includes(subject))) && plan.attributes.every(attribute => attribute.marker.test(normalize(topicText(text))));
}
export function missingSemanticSubjects(query, text, compatibility = []) { return requestPlan(query).semanticSubjects.filter(subject => !subjectPresent(subject, text, compatibility)); }
export function missingPropertySubjects(query, evidence, compatibility = []) {
    const plan = requestPlan(query);
    if (!plan.attributes.length)
        return [];
    return plan.subjects.filter(subject => !evidence.some(text => subjectPresent(subject, text, compatibility)));
}
/** The documented exclusive renewable lease/lock relationship is an input
 * alias for the existing model. It is not a new boolean answerability gate.
 */
export function semanticSupportText(text) {
    const body = topicText(text);
    if (/\bexclusive\s+leases?\b/i.test(body) && /\brenew(?:s|ed|ing)?\b/i.test(body) && !/\b(?:never\s+renews?|(?:does|can)\s+not\s+renew|cannot\s+renew)\b/i.test(body))
        return body.replace(/\bleases?\b/gi, 'lock');
    return body;
}
export function hasTopicSupport(query, evidence, _metadata = [], allowSemanticAlias = true) {
    const plan = requestPlan(query), topics = terms(normalize(query));
    return evidence.some(text => {
        if (!passageSupportsRequest(query, text))
            return false;
        if (plan.attributes.length)
            return true;
        const stem = (word) => word.replace(/ies$/, 'y').replace(/s$/, '');
        const body = terms(normalize(topicText(text))), stems = new Set(body.map(stem));
        const matches = topics.filter(t => stems.has(stem(t)));
        // Require a substantive conjunction rather than one accidental shared word.
        if (matches.length >= 2)
            return true;
        // Keep the direct, documented software lease alias inspectable for callers;
        // production evaluates its paraphrases with the same model below.
        return allowSemanticAlias && /\blocks?\b/i.test(query) && semanticSupportText(text) !== topicText(text) && !plan.subjects.length;
    });
}
/** Eight bounded scoring windows cover short facts and both ends. Select
 * windows by query overlap when supplied, then fill from uniform coverage.
 * Unselected text can still be missed; scores are not entailment guarantees.
 */
export function semanticSupportWindows(text, query = '') {
    return semanticSupportSpans(text, query).map(span => span.text);
}
/** Quote adjacent sentence context around a verified unit. Scoring stays on
 * the unit; this only displays its original conditions instead of a fragment.
 */
export function returnedSpanContext(text, start, end) {
    const boundaries = [0];
    for (const match of text.matchAll(/(?<=[.!?])\s+|\n+/g))
        boundaries.push(match.index + match[0].length);
    boundaries.push(text.length);
    const before = boundaries.filter(offset => offset <= start).at(-1) ?? 0, after = boundaries.filter(offset => offset >= end);
    // Keep nearby setup/refresh conditions with the selected unit. A single
    // following sentence can omit the actionable instruction later in the
    // same short section. The existing 1600-character maximum still applies.
    let begin = before, finish = after.find(offset => offset >= Math.min(text.length, end + 900)) ?? text.length;
    if (finish - begin > 1600) {
        begin = Math.max(before, start - 160, end - 1600);
        const nextSpace = text.indexOf(' ', begin);
        if (begin > before && nextSpace >= 0 && nextSpace < start)
            begin = nextSpace + 1;
        finish = Math.min(finish, begin + 1600);
    }
    if (/[\uDC00-\uDFFF]/.test(text[begin] || ''))
        begin++;
    if (/[\uD800-\uDBFF]/.test(text[finish - 1] || ''))
        finish--;
    return { text: text.slice(begin, finish), start: begin, end: finish };
}
/** Exact offsets into already returned text; never read or ingest new files. */
export function semanticSupportSpans(text, query = '') {
    const segments = [], separators = /(?<=[.!?])\s+|\n+/g;
    let cursor = 0;
    const add = (start, end) => { while (start < end && /\s/.test(text[start]))
        start++; while (end > start && /\s/.test(text[end - 1]))
        end--; if (start < end)
        segments.push({ start, end }); };
    for (const match of text.matchAll(separators)) {
        add(cursor, match.index);
        cursor = match.index + match[0].length;
    }
    add(cursor, text.length);
    const candidates = [], seen = new Set();
    for (let i = 0; i < segments.length; i++)
        for (const last of [i, ...(segments[i + 1] ? [i + 1] : [])]) {
            const start = segments[i].start;
            let end = Math.min(segments[last].end, start + 1600);
            if (/[\uD800-\uDBFF]/.test(text[end - 1] || ''))
                end--;
            const value = text.slice(start, end), key = topicText(value).replace(/\s+/g, ' ').trim();
            if (!key || value === text.trim() || seen.has(key))
                continue;
            seen.add(key);
            candidates.push({ text: value, start, end });
        }
    const phraseCandidates = [];
    for (const segment of segments) {
        const tokens = [...text.slice(segment.start, segment.end).matchAll(/\S+/g)];
        for (let i = 0; i + 3 <= tokens.length; i++) {
            const start = segment.start + tokens[i].index, end = segment.start + tokens[i + 2].index + tokens[i + 2][0].length;
            if (end - start <= 1600)
                phraseCandidates.push({ text: text.slice(start, end), start, end });
        }
    }
    const root = (word) => word.replace(/ies$/, 'y').replace(/s$/, '').replace(/(?:ed|ing)$/, '').replace(/e$/, '').replace(/([bcdfghjklmnpqrstvwxyz])\1$/, '$1');
    const topics = terms(normalize(query)), chosen = [];
    const overlap = (candidate) => { const roots = new Set(terms(normalize(topicText(candidate.text))).map(root)); return topics.filter(t => roots.has(root(t))).length; };
    if (candidates.length <= 8)
        chosen.push(...candidates);
    else {
        if (topics.length)
            for (const candidate of [...candidates].filter(candidate => overlap(candidate) > 0).sort((a, b) => overlap(b) - overlap(a)).slice(0, 4))
                chosen.push(candidate);
        const remaining = 8 - chosen.length;
        for (let i = 0; i < remaining; i++) {
            const value = candidates[remaining === 1 ? candidates.length - 1 : Math.round(i * (candidates.length - 1) / (remaining - 1))];
            if (!chosen.includes(value))
                chosen.push(value);
        }
        // Duplicate selected windows do not shift the uniform sample toward the start.
        for (let i = 0; i < 8 && chosen.length < 8; i++) {
            const value = candidates[Math.round(i * (candidates.length - 1) / 7)];
            if (!chosen.includes(value))
                chosen.push(value);
        }
        for (const value of candidates)
            if (chosen.length < 8 && !chosen.includes(value))
                chosen.push(value);
    }
    // Keep sentence coverage and reserve four slots for short predicate/object
    // units when query stems overlap. Stemming selects windows only: it never
    // relaxes identities, fields or the component cosine requirement.
    const relevant = phraseCandidates.filter(span => overlap(span) > 0).sort((a, b) => overlap(b) - overlap(a) || a.text.length - b.text.length || a.start - b.start);
    if (!relevant.length && chosen.length)
        return chosen;
    if (!relevant.length && !chosen.length && !requestPlan(query).semanticSubjects.length)
        return [];
    const sentenceCoverage = chosen.some(span => overlap(span) > 0) ? chosen.slice(0, 4) : [0, 2, 5, 7].map(i => chosen[Math.min(i, chosen.length - 1)]).filter((span) => !!span);
    const phrases = relevant.length ? relevant.slice(0, 4) : Array.from({ length: Math.min(8, phraseCandidates.length) }, (_, i) => phraseCandidates[Math.round(i * (phraseCandidates.length - 1) / Math.max(1, Math.min(8, phraseCandidates.length) - 1))]);
    const result = [], keys = new Set();
    for (const span of [...sentenceCoverage, ...phrases, ...chosen]) {
        const key = topicText(span.text).replace(/\s+/g, ' ').trim();
        if (key && !keys.has(key)) {
            result.push(span);
            keys.add(key);
        }
        if (result.length === 8)
            break;
    }
    return result;
}
//# sourceMappingURL=support.js.map