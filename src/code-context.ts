import type { ApiContext } from './api-context.js';

/** The syntax tree comes from Grounded's installed parser. This is declaration
 * corroboration for an already returned passage, never conversion or indexing. */
export type CodeNode = { type: string; startIndex: number; endIndex: number; hasError: boolean; namedChildren: CodeNode[]; childForFieldName(name: string): CodeNode | null };
const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();
export function declaredCodeContext(source: string, passage: string, root: CodeNode, requested: string[]): ApiContext | undefined {
    if (source.length > 200000 || root.hasError || !requested.length) return;
    const whole = normalized(passage);
    // Require the actual upstream quotation in this snapshot before inspecting
    // any declaration. Fences/rendered rewrites do not authorize inferred scope.
    if (whole.length < 32 || !normalized(source).includes(whole)) return;
    const fragments = passage.split(/\n/).map(normalized).filter(s => s.length >= 32);
    const matches: { owner: CodeNode; method: CodeNode; identifier: string }[] = [];
    const visit = (node: CodeNode) => {
        if (node.type === 'class_declaration' || node.type === 'abstract_class_declaration') {
            const name = node.childForFieldName('name'), body = node.childForFieldName('body');
            const owner = name && source.slice(name.startIndex, name.endIndex);
            if (owner && /^[A-Za-z_$][\w$]*$/.test(owner)) for (const method of body?.namedChildren || []) {
                if (method.type !== 'method_definition' || method.hasError) continue;
                const memberNode = method.childForFieldName('name');
                const member = memberNode && source.slice(memberNode.startIndex, memberNode.endIndex);
                if (!member || !/^[A-Za-z_$][\w$]*$/.test(member)) continue;
                const identifier = owner + '.' + member;
                const text = normalized(source.slice(method.startIndex, method.endIndex));
                if (requested.includes(identifier) && fragments.some(f => text.includes(f))) matches.push({ owner: node, method, identifier });
            }
            // Nested/local classes cannot silently borrow an outer owner.
            return;
        }
        for (const child of node.namedChildren) visit(child);
    };
    visit(root);
    if (matches.length !== 1) return;
    const { owner, method, identifier } = matches[0]!;
    const declarations = [owner, method].map(node => {
        const body = node.childForFieldName('body');
        const end = body ? body.startIndex + 1 : node.endIndex;
        return { text: source.slice(node.startIndex, end), start: node.startIndex, end };
    });
    // A returned multi-method chunk can now quote just the requested proved
    // member. Avoid arbitrarily slicing a large member around an unrelated hit.
    if (method.endIndex - method.startIndex > 12000) return;
    return { identifiers: [identifier], declarations, sourceExcerpt: { start: method.startIndex, end: method.endIndex } };
}
