/** One existing model session, bounded admission and no concurrent inference.
 * Interactive comparisons can pass waiting indexing batches. A bounded burst
 * still lets indexing advance; disconnected clients do not consume inference.
 */
export declare class EmbeddingQueue {
    private readonly maximum;
    private readonly burst;
    private ordinary;
    private interactive;
    private running;
    private outstanding;
    constructor(maximum?: number, burst?: number);
    run<T>(run: () => Promise<T>, interactive?: boolean, cancelled?: () => boolean): Promise<T>;
    private drain;
}
