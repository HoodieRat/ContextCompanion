const normalized = (text) => text.replace(/:[a-z]+:`([^`]+)`/g, '$1').replace(/[`*~]/g, '').replace(/\s+/g, ' ').trim();
export function declaredApiContext(source, passage, requestedIdentifiers = []) {
    if (source.length > 200000)
        return;
    const fragments = passage.split(/\n\s*\n|\n|(?<=[.!?])\s+/).map(normalized).filter(s => s.length >= 32);
    const declarationOnly = /^\s*\.\.\s+(?:class|method|coroutinemethod|function|attribute|data)::[^\n]+\s*$/.test(passage) || /^##+\s+`?[\w]+(?:\.[\w]+)+(?:\([^`\n]*\))?`?\s*$/.test(passage.trim());
    if (!fragments.length && !declarationOnly)
        return;
    const declarations = [];
    let module = '', owner = '', member = '';
    let moduleDecl, ownerDecl, memberDecl;
    let overloads = [];
    let ownerRst = false, ownerIndent = -1, memberIndent = -1;
    const contexts = [];
    let offset = 0, blockStart = 0;
    const flush = (end) => { if (owner && end > blockStart)
        contexts.push({ owner, member, module, declarations: [moduleDecl, ownerDecl, ...overloads, memberDecl].filter((d) => !!d), start: blockStart, end }); };
    for (const line of source.split(/(?<=\n)/)) {
        const directive = line.match(/^(\s*)\.\.\s+(module|currentmodule|class|method|coroutinemethod|function|attribute|data)::\s*([\w.]+)/);
        const heading = line.match(/^##+\s+`?([\w]+(?:\.[\w]+)+)(?:\(|`|\s|$)/);
        const section = /^[=~-]{3,}\s*$/.test(line) && !/^\s/.test(line);
        if (directive || heading || section) {
            // Consecutive signatures of the same Markdown API share one definition.
            // Any intervening prose or different owner remains a separate context.
            const prior = overloads.at(-1) || ownerDecl;
            if (heading && !ownerRst && heading[1] === owner && prior && !source.slice(prior.end, offset).trim()) {
                overloads.push({ text: line.trimEnd(), start: offset, end: offset + line.trimEnd().length });
                offset += line.length;
                continue;
            }
            flush(offset);
            blockStart = offset;
            overloads = [];
            const d = { text: line.trimEnd(), start: offset, end: offset + line.trimEnd().length };
            if (heading) {
                owner = heading[1];
                member = '';
                module = '';
                ownerDecl = d;
                memberDecl = undefined;
                moduleDecl = undefined;
                ownerRst = false;
                ownerIndent = -1;
                memberIndent = -1;
            }
            else if (section) {
                owner = '';
                member = '';
                ownerDecl = undefined;
                memberDecl = undefined;
                ownerRst = false;
                ownerIndent = -1;
                memberIndent = -1;
            }
            else if (directive) {
                const kind = directive[2], name = directive[3];
                if (kind === 'module' || kind === 'currentmodule') {
                    module = name;
                    moduleDecl = d;
                    owner = '';
                    ownerDecl = undefined;
                    member = '';
                    memberDecl = undefined;
                    ownerRst = false;
                    ownerIndent = -1;
                    memberIndent = -1;
                }
                else if (kind === 'class') {
                    owner = name;
                    ownerDecl = d;
                    member = '';
                    memberDecl = undefined;
                    ownerRst = true;
                    ownerIndent = directive[1].length;
                    memberIndent = -1;
                }
                else if (!directive[1]) {
                    owner = name;
                    ownerDecl = d;
                    member = '';
                    memberDecl = undefined;
                    ownerRst = true;
                    ownerIndent = 0;
                    memberIndent = -1;
                }
                else {
                    member = name.split('.').at(-1);
                    memberDecl = d;
                    memberIndent = directive[1].length;
                }
            }
        }
        else if (ownerRst && owner && line.trim()) {
            const indent = line.match(/^\s*/)?.[0].length || 0;
            if ((member && indent <= memberIndent) || indent <= ownerIndent) {
                flush(offset);
                blockStart = offset;
                member = '';
                memberDecl = undefined;
                memberIndent = -1;
                if (indent <= ownerIndent) {
                    owner = '';
                    ownerDecl = undefined;
                    ownerRst = false;
                    ownerIndent = -1;
                }
            }
        }
        offset += line.length;
    }
    flush(source.length);
    const whole = normalized(passage);
    const completeMatches = declarationOnly ? [] : contexts.filter(context => normalized(source.slice(context.start, context.end)).includes(whole));
    const key = (context) => [context.module, context.owner, context.member].filter(Boolean).join('.');
    const declaredIds = (context) => {
        const qualified = [context.module, context.owner].filter(Boolean).join('.');
        return [qualified, context.module, context.owner, ...(context.member ? [`${qualified}.${context.member}`, `${context.owner}.${context.member}`] : [])].filter(Boolean);
    };
    let matches = completeMatches;
    if (declarationOnly)
        matches = contexts.filter(context => context.declarations.some(d => d.start === context.start && d.text.trim() === passage.trim()));
    else if (!matches.length) {
        // Intersect corroborated fragments: rendered wording may differ, but a
        // fragment pointing to another API cannot lend that API's declaration.
        const scopes = fragments.map(fragment => contexts.filter(context => normalized(source.slice(context.start, context.end)).includes(fragment))).filter(group => group.length);
        matches = contexts.filter(context => scopes.length && scopes.every(group => group.some(other => key(other) === key(context))));
    }
    if (declarationOnly && matches.length > 1 && requestedIdentifiers.length) {
        // The same declaration spelling can occur on several classes. Resolve it
        // only against a complete identifier proved by this snapshot's declarations.
        matches = matches.filter(context => declaredIds(context).some(id => requestedIdentifiers.includes(id)));
    }
    if (!matches.length)
        return;
    const owners = new Set(matches.map(c => [c.module, c.owner, c.member].filter(Boolean).join('.')));
    if (owners.size !== 1)
        return;
    const ids = new Set();
    for (const context of matches) {
        const qualified = [context.module, context.owner].filter(Boolean).join('.');
        for (const identifier of declaredIds(context))
            ids.add(identifier);
        // A method reference in the owner's documented body may name an inherited
        // method. Require the actual quoted body and retain its exact declaration.
        const body = source.slice(context.start, context.end);
        for (const match of body.matchAll(/:meth:`~?([\w.]+)`/g)) {
            const memberName = match[1].split('.').at(-1);
            const parent = match[1].split('.').slice(0, -1).join('.');
            // A cross-reference inside another method is not a declaration of that
            // method on this owner. Only the class's own inherited-API description
            // can bind a referenced parent method, with that parent named explicitly.
            if (!context.member && parent && body.includes(`:class:\`${parent}\``) && fragments.some(fragment => fragment.includes(match[1]))) {
                ids.add(`${qualified}.${memberName}`);
                ids.add(`${context.owner}.${memberName}`);
            }
        }
        for (const declaration of context.declarations)
            if (!declarations.some(d => d.start === declaration.start))
                declarations.push(declaration);
    }
    let sourceExcerpt, overview;
    if (matches.length === 1) {
        const context = matches[0], qualified = [context.module, context.owner, context.member].filter(Boolean).join('.');
        const aliases = context.member ? [qualified, context.owner + '.' + context.member] : [qualified];
        // A unique explicitly requested API section can retain nearby qualifications.
        // Generic/ambiguous hits and oversized sections keep their original excerpt.
        const requested = aliases.some(id => id.includes('.') && requestedIdentifiers.includes(id));
        if (declarationOnly || (requested && context.end - context.start <= 1600)) {
            let end = Math.min(context.end, context.start + 1600);
            if (/[\uD800-\uDBFF]/.test(source[end - 1] || ''))
                end--;
            sourceExcerpt = { start: context.start, end };
        }
        if (requested) {
            const declaration = context.declarations.at(-1);
            const definition = source.slice(declaration.end, context.end).replace(/<!--[\s\S]*?-->/g, '').split(/\n\s*\n/).find(block => block.trim() && !/^(?:\.\.|#|[*+-]\s|```|~~~)/.test(block.trim()));
            if (declarationOnly && sourceExcerpt && definition && !normalized(source.slice(sourceExcerpt.start, sourceExcerpt.end)).includes(normalized(definition))) {
                const start = source.indexOf(definition, declaration.end);
                if (start >= declaration.end && start < context.end) {
                    let end = Math.min(context.end, start + 1600);
                    if (/[\uD800-\uDBFF]/.test(source[end - 1] || ''))
                        end--;
                    sourceExcerpt = { start, end };
                }
            }
            overview = !!(definition && (sourceExcerpt ? normalized(source.slice(sourceExcerpt.start, sourceExcerpt.end)) : whole).includes(normalized(definition)));
        }
    }
    return { identifiers: [...ids], declarations, ...(sourceExcerpt ? { sourceExcerpt } : {}), ...(overview === undefined ? {} : { overview }) };
}
/** Exact declaration navigation within an already returned immutable file.
 * It neither crawls nor indexes: the existing scope parser must corroborate
 * one actual requested API declaration before its bounded definition is quoted.
 */
export function declaredApiDefinition(source, requestedIdentifiers) {
    if (source.length > 200000 || requestedIdentifiers.length !== 1 || !/[.:]/.test(requestedIdentifiers[0]))
        return;
    const wanted = requestedIdentifiers[0], member = wanted.split(/\.|::/).at(-1);
    const matches = [];
    for (const line of source.split('\n')) {
        const declaration = line.match(/^\s*\.\.\s+(?:class|method|coroutinemethod|function|attribute|data)::\s*([\w.]+)/)?.[1] || line.match(/^##+\s+`?([\w]+(?:\.[\w]+)+)(?:\(|`|\s|$)/)?.[1];
        if (!declaration || declaration.split('.').at(-1) !== member)
            continue;
        const context = declaredApiContext(source, line, requestedIdentifiers);
        if (context?.identifiers.includes(wanted) && context.sourceExcerpt && !matches.some(other => other.sourceExcerpt?.start === context.sourceExcerpt.start))
            matches.push(context);
    }
    return matches.length === 1 ? matches[0] : undefined;
}
//# sourceMappingURL=api-context.js.map