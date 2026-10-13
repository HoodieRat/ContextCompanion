import { AppError } from './util.js';
/** One existing model session, bounded admission and no concurrent inference.
 * Interactive comparisons can pass waiting indexing batches. A bounded burst
 * still lets indexing advance; disconnected clients do not consume inference.
 */
export class EmbeddingQueue {
    maximum;
    burst;
    ordinary = [];
    interactive = [];
    running = false;
    outstanding = 0;
    constructor(maximum = 16, burst = 4) {
        this.maximum = maximum;
        this.burst = burst;
    }
    run(run, interactive = false, cancelled = () => false) {
        if (this.outstanding >= this.maximum)
            return Promise.reject(new AppError('Embedding queue is full. Retry shortly.', 429));
        this.outstanding++;
        return new Promise((resolve, reject) => {
            const work = { run, cancelled, resolve: value => resolve(value), reject };
            (interactive ? this.interactive : this.ordinary).push(work);
            void this.drain();
        });
    }
    async drain() {
        if (this.running)
            return;
        this.running = true;
        let served = 0;
        try {
            while (this.interactive.length || this.ordinary.length) {
                const interactive = this.interactive.length > 0 && (!this.ordinary.length || served < this.burst);
                const work = (interactive ? this.interactive : this.ordinary).shift();
                served = interactive ? served + 1 : 0;
                try {
                    if (work.cancelled())
                        throw new AppError('Embedding request cancelled.', 499);
                    const result = await work.run();
                    if (work.cancelled())
                        throw new AppError('Embedding request cancelled.', 499);
                    work.resolve(result);
                }
                catch (error) {
                    work.reject(error);
                }
                finally {
                    this.outstanding--;
                }
            }
        }
        finally {
            this.running = false;
        }
    }
}
//# sourceMappingURL=embedding-queue.js.map