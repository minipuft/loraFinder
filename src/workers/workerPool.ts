import { createImageProcessor } from './imageProcessor.js';

// Define the type for the processor instance more explicitly
type ImageProcessorInstance = ReturnType<typeof createImageProcessor>;

class WorkerPool {
  private static instance: WorkerPool;
  // Use the more specific type
  private imageProcessor: ImageProcessorInstance | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): WorkerPool {
    if (!WorkerPool.instance) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }

  // Use the more specific return type
  public getImageProcessor(): ImageProcessorInstance {
    if (!this.imageProcessor) {
      console.log('WorkerPool: Initializing Image Processor...');
      this.imageProcessor = createImageProcessor();
      this.isInitialized = true;
    } else {
      // console.log('WorkerPool: Returning existing Image Processor.');
    }
    return this.imageProcessor;
  }

  // Add method to cancel pending tasks
  public cancelPendingTasks() {
    if (this.imageProcessor && this.isInitialized) {
      console.log('WorkerPool: Cancelling pending image processing tasks...');
      this.imageProcessor.cancel();
    } else {
      console.log('WorkerPool: No active image processor to cancel tasks for.');
    }
  }

  public cleanup() {
    if (this.imageProcessor && this.isInitialized) {
      console.log('WorkerPool: Cleaning up Image Processor...');
      // Call terminate which now includes cancel logic
      this.imageProcessor.terminate();
      this.imageProcessor = null;
      this.isInitialized = false;
    } else {
      console.log('WorkerPool: No active image processor to clean up.');
    }
  }
}

export default WorkerPool;
