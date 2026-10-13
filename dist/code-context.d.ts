import type { ApiContext } from './api-context.js';
/** The syntax tree comes from Grounded's installed parser. This is declaration
 * corroboration for an already returned passage, never conversion or indexing. */
export type CodeNode = {
    type: string;
    startIndex: number;
    endIndex: number;
    hasError: boolean;
    namedChildren: CodeNode[];
    childForFieldName(name: string): CodeNode | null;
};
export declare function declaredCodeContext(source: string, passage: string, root: CodeNode, requested: string[]): ApiContext | undefined;
