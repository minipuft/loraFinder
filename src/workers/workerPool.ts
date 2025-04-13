import { createImageProcessor } from './imageProcessor.js';

class WorkerPool {
  private static instance: WorkerPool;
  private imageProcessor: ReturnType<typeof createImageProcessor> | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): WorkerPool {
    if (!WorkerPool.instance) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }

  public getImageProcessor(): ReturnType<typeof createImageProcessor> {
    if (!this.imageProcessor) {
      this.imageProcessor = createImageProcessor();
      this.isInitialized = true;
    }
    return this.imageProcessor;
  }

  public cleanup() {
    if (this.imageProcessor && this.isInitialized) {
      this.imageProcessor.terminate();
      this.imageProcessor = null;
      this.isInitialized = false;
    }
  }
}

export default WorkerPool;
