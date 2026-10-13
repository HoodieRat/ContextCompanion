import { AppError } from './util.js';
type Work = { run: () => Promise<unknown>; cancelled: () => boolean; resolve: (value: unknown) => void; reject: (error: unknown) => void };
/** One existing model session, bounded admission and no concurrent inference.
 * Interactive comparisons can pass waiting indexing batches. A bounded burst
 * still lets indexing advance; disconnected clients do not consume inference.
 */
export class EmbeddingQueue {
    private ordinary: Work[] = [];
    private interactive: Work[] = [];
    private running = false;
    private outstanding = 0;
    constructor(private readonly maximum = 16, private readonly burst = 4) { }
    run<T>(run: () => Promise<T>, interactive = false, cancelled = () => false): Promise<T> {
        if (this.outstanding >= this.maximum) return Promise.reject(new AppError('Embedding queue is full. Retry shortly.', 429));
        this.outstanding++;
        return new Promise<T>((resolve, reject) => {
            const work: Work = { run, cancelled, resolve: value => resolve(value as T), reject };
            (interactive ? this.interactive : this.ordinary).push(work);
            void this.drain();
        });
    }
    private async drain(): Promise<void> {
        if (this.running) return;
        this.running = true;
        let served = 0;
        try {
            while (this.interactive.length || this.ordinary.length) {
                const interactive = this.interactive.length > 0 && (!this.ordinary.length || served < this.burst);
                const work = (interactive ? this.interactive : this.ordinary).shift()!;
                served = interactive ? served + 1 : 0;
                try {
                    if (work.cancelled()) throw new AppError('Embedding request cancelled.', 499);
                    const result = await work.run();
                    if (work.cancelled()) throw new AppError('Embedding request cancelled.', 499);
                    work.resolve(result);
                } catch (error) { work.reject(error); }
                finally { this.outstanding--; }
            }
        } finally { this.running = false; }
    }
}
