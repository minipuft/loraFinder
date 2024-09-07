import { createImageProcessor } from "./imageProcessor.js";
import { ImageInfo } from '../types.js'; // Add this import at the top of the file

export class WorkerPool {
  private workers: Worker[];
  private queue: { image: ImageInfo; resolve: (result: string) => void }[];
  private busyWorkers: Set<Worker>;

  constructor(size: number) {
    this.workers = Array.from(
      { length: size },
      () => createImageProcessor() as unknown as Worker
    );
    this.queue = [];
    this.busyWorkers = new Set();

    this.workers.forEach((worker) => {
      worker.onmessage = this.handleWorkerMessage.bind(this, worker);
    });
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent) {
    if (event.data.action === "imageProcessed") {
      const task = this.queue.shift();
      if (task) {
        task.resolve(event.data.processedImage);
      }
      this.busyWorkers.delete(worker);
      this.processQueue();
    }
  }

  private processQueue() {
    while (
      this.queue.length > 0 &&
      this.busyWorkers.size < this.workers.length
    ) {
      const worker = this.workers.find((w) => !this.busyWorkers.has(w));
      if (worker) {
        const task = this.queue.shift()!;
        worker.postMessage({ action: "processImage", ...task.image });
        this.busyWorkers.add(worker);
      }
    }
  }

  public processImage(image: ImageInfo): Promise<string> {
    return new Promise((resolve) => {
      this.queue.push({ image, resolve });
      this.processQueue();
    });
  }

  public terminate() {
    this.workers.forEach((worker) => worker.terminate());
  }
}

export const workerPool = new WorkerPool(navigator.hardwareConcurrency || 4);
