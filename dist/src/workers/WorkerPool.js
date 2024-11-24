import { createImageProcessor } from "./imageProcessor.js";
export class WorkerPool {
    workers;
    queue;
    busyWorkers;
    constructor(size) {
        this.workers = Array.from({ length: size }, () => createImageProcessor());
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
        while (this.queue.length > 0 &&
            this.busyWorkers.size < this.workers.length) {
            const worker = this.workers.find((w) => !this.busyWorkers.has(w));
            if (worker) {
                const task = this.queue.shift();
                worker.postMessage({ action: "processImage", ...task.image });
                this.busyWorkers.add(worker);
            }
        }
    }
    processImage(image) {
        return new Promise((resolve) => {
            this.queue.push({ image, resolve });
            this.processQueue();
        });
    }
    terminate() {
        this.workers.forEach((worker) => worker.terminate());
    }
}
export const workerPool = new WorkerPool(navigator.hardwareConcurrency || 4);
//# sourceMappingURL=WorkerPool.js.map