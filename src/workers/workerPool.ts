import { createImageProcessor } from './imageProcessor.js';
// Import the actual worker type for type safety
import LayoutWorker from './layoutWorker.worker.ts?worker'; // Vite worker import syntax
// Import the new color extractor worker
import ColorExtractorWorker from './colorExtractor.worker.ts?worker';
// Import the new grouping worker
import PQueue from 'p-queue'; // Import p-queue
import { v4 as uuidv4 } from 'uuid'; // Use UUID for unique request IDs
import GroupingWorker from './groupingWorker.worker.ts?worker';

// Define the type for the processor instance more explicitly
type ImageProcessorInstance = ReturnType<typeof createImageProcessor>;
// Define the type for the layout worker instance
type LayoutWorkerInstance = Worker;
// Define the type for the color extractor worker instance
type ColorExtractorWorkerInstance = Worker;
// Define the type for the grouping worker instance
type GroupingWorkerInstance = Worker;
type WorkerInstance = LayoutWorkerInstance | ColorExtractorWorkerInstance | GroupingWorkerInstance;
type WorkerType = 'layout' | 'color' | 'grouping';

// Interface for messages sent TO workers (includes requestId)
interface WorkerRequestMessage<T = any> {
  type: string; // Original message type
  payload: T;
  requestId: string;
}

// Interface for messages received FROM workers (includes requestId)
interface WorkerResponseMessage<T = any> {
  type: string; // e.g., 'layoutResult', 'colorResult', 'groupingResult', 'error'
  payload: T;
  requestId: string;
}

interface WorkerErrorMessage {
  type: 'error';
  message: string;
  requestId?: string; // Optional: Worker might include ID with error
}

interface PendingRequest<T> {
  resolve: (value: T | PromiseLike<T>) => void; // Allow PromiseLike for better compatibility
  reject: (reason?: any) => void;
  timer?: ReturnType<typeof setTimeout>; // Optional: Timeout timer
}

class WorkerPool {
  private static instance: WorkerPool;
  // Use the more specific type
  private imageProcessor: ImageProcessorInstance | null = null;
  private layoutWorker: LayoutWorkerInstance | null = null;
  private colorExtractorWorker: ColorExtractorWorkerInstance | null = null; // Add state for color worker
  private groupingWorker: GroupingWorkerInstance | null = null; // Add state for grouping worker
  private isImageProcessorInitialized = false;
  private isLayoutWorkerInitialized = false;
  private isColorExtractorInitialized = false; // Add flag for color worker
  private isGroupingWorkerInitialized = false; // Add flag for grouping worker
  private layoutWorkerListeners: Map<string, (event: MessageEvent) => void> = new Map();
  // Add listeners map for color worker
  private colorExtractorListeners: Map<string, (event: MessageEvent) => void> = new Map();
  // Add listeners map for grouping worker
  private groupingWorkerListeners: Map<string, (event: MessageEvent) => void> = new Map();

  // Initialization Promises
  private layoutWorkerPromise: Promise<LayoutWorkerInstance> | null = null;
  private colorExtractorWorkerPromise: Promise<ColorExtractorWorkerInstance> | null = null;
  private groupingWorkerPromise: Promise<GroupingWorkerInstance> | null = null;

  // Pending Requests Maps
  private pendingLayoutRequests: Map<string, PendingRequest<any>> = new Map();
  private pendingColorRequests: Map<string, PendingRequest<any>> = new Map();
  private pendingGroupingRequests: Map<string, PendingRequest<any>> = new Map();

  // --- p-queue Instances --- >
  private layoutQueue: PQueue;
  private colorQueue: PQueue;
  private groupingQueue: PQueue;

  private constructor() {
    // Initialize queues with desired concurrency
    // Layout and grouping are likely sequential operations affecting the whole view
    this.layoutQueue = new PQueue({ concurrency: 1 });
    this.groupingQueue = new PQueue({ concurrency: 1 });
    // Color extraction can often run more concurrently
    this.colorQueue = new PQueue({
      concurrency: Math.max(1, (navigator.hardwareConcurrency || 4) - 1),
    });
    console.log(
      `[WorkerPool] Initialized queues. Concurrency - Layout: ${this.layoutQueue.concurrency}, Grouping: ${this.groupingQueue.concurrency}, Color: ${this.colorQueue.concurrency}`
    );
  }

  public static getInstance(): WorkerPool {
    if (!WorkerPool.instance) {
      WorkerPool.instance = new WorkerPool();
    }
    return WorkerPool.instance;
  }

  // --- Generic Worker Initializer ---
  private initializeWorker<W extends WorkerInstance>(
    workerType: WorkerType,
    WorkerConstructor: new () => W,
    setupListenersFn: (worker: W) => void
  ): Promise<W> {
    console.log(`WorkerPool: Initializing ${workerType} Worker...`);
    return new Promise<W>((resolve, reject) => {
      try {
        const worker = new WorkerConstructor();
        setupListenersFn(worker);
        console.log(`WorkerPool: ${workerType} Worker initialized successfully.`);
        resolve(worker);
      } catch (error) {
        console.error(`[WorkerPool] Failed to initialize ${workerType} Worker:`, error);
        reject(new Error(`Failed to initialize ${workerType} Worker`));
      }
    });
  }

  // --- Image Processor Management ---

  public getImageProcessor(): ImageProcessorInstance {
    if (!this.imageProcessor) {
      console.log('WorkerPool: Initializing Image Processor...');
      this.imageProcessor = createImageProcessor();
      this.isImageProcessorInitialized = true;
    } else {
      // console.log('WorkerPool: Returning existing Image Processor.');
    }
    return this.imageProcessor;
  }

  // Add method to cancel pending image processing tasks
  public cancelPendingImageTasks() {
    if (this.imageProcessor && this.isImageProcessorInitialized) {
      console.log('WorkerPool: Cancelling pending image processing tasks...');
      this.imageProcessor.cancel?.(); // Use optional chaining
    } else {
      // console.log('WorkerPool: No active image processor to cancel tasks for.');
    }
  }

  // --- Layout Worker Management (Promise-based) ---
  public getLayoutWorker(): Promise<LayoutWorkerInstance> {
    if (!this.layoutWorkerPromise) {
      this.layoutWorkerPromise = this.initializeWorker('layout', LayoutWorker, worker => {
        this.layoutWorker = worker; // Store the instance
        this.setupWorkerMessageHandler(
          worker,
          'layout',
          this.pendingLayoutRequests,
          this.layoutWorkerListeners
        );
      }).catch(err => {
        this.layoutWorkerPromise = null; // Reset promise on failure
        throw err; // Re-throw error
      });
    }
    return this.layoutWorkerPromise;
  }

  // --- Color Extractor Worker Management (Promise-based) ---
  public getColorExtractorWorker(): Promise<ColorExtractorWorkerInstance> {
    if (!this.colorExtractorWorkerPromise) {
      this.colorExtractorWorkerPromise = this.initializeWorker(
        'color',
        ColorExtractorWorker,
        worker => {
          this.colorExtractorWorker = worker; // Store the instance
          this.setupWorkerMessageHandler(
            worker,
            'color',
            this.pendingColorRequests,
            this.colorExtractorListeners
          );
        }
      ).catch(err => {
        this.colorExtractorWorkerPromise = null; // Reset promise on failure
        throw err; // Re-throw error
      });
    }
    return this.colorExtractorWorkerPromise;
  }

  // --- Grouping Worker Management (Promise-based) ---
  public getGroupingWorker(): Promise<GroupingWorkerInstance> {
    if (!this.groupingWorkerPromise) {
      this.groupingWorkerPromise = this.initializeWorker('grouping', GroupingWorker, worker => {
        this.groupingWorker = worker; // Store the instance
        this.setupWorkerMessageHandler(
          worker,
          'grouping',
          this.pendingGroupingRequests,
          this.groupingWorkerListeners
        );
      }).catch(err => {
        this.groupingWorkerPromise = null; // Reset promise on failure
        throw err; // Re-throw error
      });
    }
    return this.groupingWorkerPromise;
  }

  // --- Generic Message Handler Setup ---
  private setupWorkerMessageHandler<T>(
    worker: WorkerInstance,
    workerType: WorkerType,
    pendingRequests: Map<string, PendingRequest<T>>,
    generalListeners: Map<string, (event: MessageEvent) => void>
  ): void {
    worker.onmessage = (event: MessageEvent<WorkerResponseMessage<T> | WorkerErrorMessage>) => {
      const { data } = event;
      const requestId = data.requestId;

      // console.log(`[WorkerPool] Received message from ${workerType} worker:`, data);

      if (requestId && pendingRequests.has(requestId)) {
        const request = pendingRequests.get(requestId)!;
        clearTimeout(request.timer); // Clear timeout if response received

        if (data.type === 'error') {
          console.error(
            `[WorkerPool] Error response for request ${requestId} from ${workerType}:`,
            (data as WorkerErrorMessage).message
          );
          request.reject(
            new Error((data as WorkerErrorMessage).message || 'Worker returned an error')
          );
        } else {
          // Assume other types are successful results
          // console.log(`[WorkerPool] Resolving request ${requestId} for ${workerType}`);
          request.resolve((data as WorkerResponseMessage<T>).payload);
        }
        pendingRequests.delete(requestId);
      } else if (requestId) {
        console.warn(
          `[WorkerPool] Received message with unknown or stale requestId ${requestId} from ${workerType}:`,
          data
        );
        // Optionally dispatch to general listeners if it's a non-error message?
        // generalListeners.forEach(listener => listener(event));
      } else {
        // Message without requestId - likely a general status or unhandled message
        // console.log(`[WorkerPool] Received non-request message from ${workerType}:`, data);
        generalListeners.forEach(listener => listener(event));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      console.error(`[WorkerPool] Generic error from ${workerType} Worker:`, event.message, event);
      // Attempt to reject related pending requests, though we lack specific request ID here
      // This is a limitation if the worker crashes without sending a request-specific error
      const error = new Error(`Worker ${workerType} encountered an error: ${event.message}`);
      pendingRequests.forEach((request, requestId) => {
        console.warn(
          `[WorkerPool] Rejecting pending request ${requestId} due to generic ${workerType} worker error.`
        );
        clearTimeout(request.timer);
        request.reject(error);
      });
      pendingRequests.clear(); // Clear all pending requests for this worker on generic error

      // Also notify general listeners
      generalListeners.forEach(listener => listener(event as any));

      // Consider terminating and resetting the worker promise here?
      // worker.terminate(); // Be careful with immediate termination
      // this[`${workerType}WorkerPromise`] = null;
      // this[`${workerType}Worker`] = null;
    };
  }

  // --- Unified Request Posting (Uses p-queue) ---
  public postRequest<RequestPayload, ResponsePayload>(
    workerType: WorkerType,
    messageType: string,
    payload: RequestPayload,
    options?: { priority?: number; timeoutMs?: number }
  ): Promise<ResponsePayload> {
    let queue: PQueue;
    let pendingRequests: Map<string, PendingRequest<ResponsePayload>>;
    let getWorkerPromise: () => Promise<WorkerInstance>;

    // Select the appropriate queue, map, and getter
    switch (workerType) {
      case 'layout':
        queue = this.layoutQueue;
        pendingRequests = this.pendingLayoutRequests;
        getWorkerPromise = this.getLayoutWorker.bind(this);
        break;
      case 'color':
        queue = this.colorQueue;
        pendingRequests = this.pendingColorRequests;
        getWorkerPromise = this.getColorExtractorWorker.bind(this);
        break;
      case 'grouping':
        queue = this.groupingQueue;
        pendingRequests = this.pendingGroupingRequests;
        getWorkerPromise = this.getGroupingWorker.bind(this);
        break;
      default:
        return Promise.reject(new Error(`Invalid worker type: ${workerType}`));
    }

    // The task added to the queue - *Removed async keyword here*
    const task = (): Promise<ResponsePayload> => {
      // Return a new promise that encapsulates the entire worker interaction
      return new Promise<ResponsePayload>(async (resolveTask, rejectTask) => {
        const requestId = uuidv4();
        // console.log(`[WorkerPool] Starting task ${requestId} (${messageType}) for ${workerType}`);

        let worker: WorkerInstance;
        try {
          // Ensure worker is initialized within the promise executor
          worker = await getWorkerPromise();
        } catch (initError) {
          console.error(
            `[WorkerPool] Failed to initialize worker ${workerType} for task ${requestId}:`,
            initError
          );
          rejectTask(initError); // Reject the task promise if init fails
          return;
        }

        // Now, manage the specific response via the pendingRequests map
        let timer: ReturnType<typeof setTimeout> | undefined = undefined;
        const responsePromise = new Promise<ResponsePayload>((resolveResponse, rejectResponse) => {
          // Store the inner promise's resolve/reject for the message handler
          pendingRequests.set(requestId, {
            resolve: resolveResponse,
            reject: rejectResponse,
            timer,
          });
        });

        // Setup timeout if specified for the *response* part
        if (options?.timeoutMs) {
          timer = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              console.warn(
                `[WorkerPool] Request ${requestId} to ${workerType} timed out after ${options.timeoutMs}ms.`
              );
              // Reject the *response* promise via the map
              pendingRequests.get(requestId)?.reject(new Error(`Request ${requestId} timed out`));
              pendingRequests.delete(requestId);
            }
          }, options.timeoutMs);
          // Update the timer reference in the map
          if (pendingRequests.has(requestId)) {
            pendingRequests.get(requestId)!.timer = timer;
          }
        }

        // Construct the message
        const workerMessage: WorkerRequestMessage<RequestPayload> = {
          type: messageType,
          payload,
          requestId,
        };

        // Post the message to the worker
        try {
          // console.log(`[WorkerPool] Posting message for ${requestId} to ${workerType}`);
          worker.postMessage(workerMessage);
        } catch (postError) {
          console.error(
            `[WorkerPool] Error posting message for request ${requestId} to ${workerType}:`,
            postError
          );
          clearTimeout(timer);
          pendingRequests.delete(requestId);
          rejectTask(postError); // Reject the outer task promise if postMessage fails
          return;
        }

        // Link the outer task promise to the inner response promise
        try {
          const result = await responsePromise;
          resolveTask(result);
        } catch (error) {
          rejectTask(error);
        } finally {
          clearTimeout(timer); // Ensure timer is cleared if response promise settles
        }
      });
    };

    // Add the task function to the queue
    return queue.add(task, { priority: options?.priority ?? 0 }) as Promise<ResponsePayload>;
  }

  // --- Listener Management (for general messages, if still needed) ---

  public addLayoutWorkerListener(id: string, listener: (event: MessageEvent) => void): void {
    console.log(`[WorkerPool] Adding general listener for LayoutWorker: ${id}`);
    this.layoutWorkerListeners.set(id, listener);
    this.getLayoutWorker(); // Ensure worker is initialized to receive potential messages
  }

  public removeLayoutWorkerListener(id: string): void {
    if (this.layoutWorkerListeners.has(id)) {
      console.log(`[WorkerPool] Removing general listener for LayoutWorker: ${id}`);
      this.layoutWorkerListeners.delete(id);
    }
  }

  public addColorExtractorListener(id: string, listener: (event: MessageEvent) => void): void {
    console.log(`[WorkerPool] Adding general listener for ColorExtractorWorker: ${id}`);
    this.colorExtractorListeners.set(id, listener);
    this.getColorExtractorWorker();
  }

  public removeColorExtractorListener(id: string): void {
    if (this.colorExtractorListeners.has(id)) {
      console.log(`[WorkerPool] Removing general listener for ColorExtractorWorker: ${id}`);
      this.colorExtractorListeners.delete(id);
    }
  }

  public addGroupingWorkerListener(id: string, listener: (event: MessageEvent) => void): void {
    console.log(`[WorkerPool] Adding general listener for GroupingWorker: ${id}`);
    this.groupingWorkerListeners.set(id, listener);
    this.getGroupingWorker();
  }

  public removeGroupingWorkerListener(id: string): void {
    if (this.groupingWorkerListeners.has(id)) {
      console.log(`[WorkerPool] Removing general listener for GroupingWorker: ${id}`);
      this.groupingWorkerListeners.delete(id);
    }
  }

  // --- Cancellation ---

  public cancelPendingLayoutTasks(all: boolean = false) {
    this.cancelTasks('layout', this.layoutQueue, this.pendingLayoutRequests, all);
  }
  public cancelPendingColorTasks(all: boolean = false) {
    this.cancelTasks('color', this.colorQueue, this.pendingColorRequests, all);
  }
  public cancelPendingGroupingTasks(all: boolean = false) {
    this.cancelTasks('grouping', this.groupingQueue, this.pendingGroupingRequests, all);
  }

  private cancelTasks<T>(
    workerType: WorkerType,
    queue: PQueue,
    pendingRequests: Map<string, PendingRequest<T>>,
    all: boolean = true // Default to cancelling all
  ) {
    if (!all) {
      console.warn(
        `[WorkerPool] Specific request cancellation via ID is not directly supported with queue.clear(). Use cancelAllPendingTasks() or implement AbortSignal.`
      );
      return;
    }

    console.log(`[WorkerPool] Cancelling pending tasks and clearing queue for ${workerType}...`);

    // 1. Clear tasks waiting in the queue (these haven't started)
    queue.clear();

    // 2. Reject promises for tasks already sent to the worker (in-flight)
    pendingRequests.forEach((request, id) => {
      console.warn(
        `[WorkerPool] Rejecting in-flight request ${id} for ${workerType} due to cancellation.`
      );
      clearTimeout(request.timer);
      request.reject(new Error(`Request ${id} for ${workerType} was cancelled.`));
      // Optionally, try to notify the worker if it supports cancellation messages
      // const worker = this[`${workerType}Worker`];
      // if (worker) {
      //     try { worker.postMessage({ type: 'cancel', requestId: id }); } catch(e) {}
      // }
    });
    pendingRequests.clear(); // Clear the map after rejecting
  }

  // --- General Cleanup ---

  public cleanup() {
    console.log('WorkerPool: Starting cleanup...');
    this.cancelAllPendingTasks(); // Cancel everything first

    // Terminate Workers
    this.terminateWorker('layout', this.layoutWorker);
    this.layoutWorker = null;
    this.layoutWorkerPromise = null;
    this.layoutWorkerListeners.clear();

    this.terminateWorker('color', this.colorExtractorWorker);
    this.colorExtractorWorker = null;
    this.colorExtractorWorkerPromise = null;
    this.colorExtractorListeners.clear();

    this.terminateWorker('grouping', this.groupingWorker);
    this.groupingWorker = null;
    this.groupingWorkerPromise = null;
    this.groupingWorkerListeners.clear();

    // Cleanup Image Processor
    if (this.imageProcessor) {
      console.log('WorkerPool: Cleaning up Image Processor...');
      this.imageProcessor.terminate?.();
      this.imageProcessor = null;
    }

    // Clear queues (should be empty after cancelAll, but good practice)
    this.layoutQueue.clear();
    this.groupingQueue.clear();
    this.colorQueue.clear();

    console.log('WorkerPool: Cleanup complete.');
  }

  private terminateWorker(workerType: WorkerType, worker: WorkerInstance | null) {
    if (worker) {
      console.log(`WorkerPool: Terminating ${workerType} worker...`);
      try {
        worker.terminate();
      } catch (e) {
        console.error(`Error terminating ${workerType} worker:`, e);
      }
    }
  }

  // Optional: Combined cancel function
  public cancelAllPendingTasks() {
    this.cancelPendingImageTasks(); // Assuming this one is different
    this.cancelPendingLayoutTasks(true);
    this.cancelPendingColorTasks(true);
    this.cancelPendingGroupingTasks(true);
  }
}

export default WorkerPool;
// Export types needed by consumers
export type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage, WorkerType };
