import ImageProcessorWorker from "./imageProcessorWorker?worker";
class BrowserWorkerPool {
    workers;
    queue;
    busyWorkers;
    constructor(size) {
        this.workers = Array.from({ length: size }, () => new ImageProcessorWorker());
        this.queue = [];
        this.busyWorkers = new Set();
        this.workers.forEach((worker) => {
            worker.onmessage = this.handleWorkerMessage.bind(this, worker);
        });
    }
    handleWorkerMessage(worker, event) {
        if (event.data.action === "imageProcessed") {
            const task = this.queue.shift();
            if (task) {
                task.resolve(event.data.processedImage);
            }
            this.busyWorkers.delete(worker);
            this.processQueue();
        }
    }
    processQueue() {
        this.queue.sort((a, b) => (a.isVisible === b.isVisible) ? 0 : a.isVisible ? -1 : 1);
        while (this.queue.length > 0 && this.busyWorkers.size < this.workers.length) {
            const worker = this.workers.find((w) => !this.busyWorkers.has(w));
            if (worker) {
                const task = this.queue.shift();
                worker.postMessage({ action: "processImage", ...task.image, isVisible: task.isVisible });
                this.busyWorkers.add(worker);
            }
        }
    }
    processImage(image, isVisible) {
        return new Promise((resolve) => {
            this.queue.push({ image, resolve, isVisible });
            this.processQueue();
        });
    }
    terminate() {
        this.workers.forEach((worker) => worker.terminate());
    }
}
class NodeWorkerPool {
    constructor(size) {
        console.warn('NodeWorkerPool is not implemented yet');
    }
    processImage(image, isVisible) {
        console.warn('NodeWorkerPool.processImage is not implemented yet');
        return Promise.resolve('dummy-processed-image-data');
    }
    terminate() {
        console.warn('NodeWorkerPool.terminate is not implemented yet');
    }
}
export function createWorkerPool(size = 4) {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        return new BrowserWorkerPool(size);
    }
    else {
        return new NodeWorkerPool(size);
    }
}
// Remove this line
// export const workerPool = new WorkerPool(navigator.hardwareConcurrency || 4);
//# sourceMappingURL=workerPool.js.map