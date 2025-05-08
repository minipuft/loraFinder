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

  // --- Layout Worker Pool --- >
  private layoutWorkers: LayoutWorkerInstance[] = [];
  private layoutWorkerPromises: (Promise<LayoutWorkerInstance> | null)[] = [];
  private layoutPoolSize: number = 1; // Default to 1, can be configured or dynamically set
  private nextLayoutWorkerIndex: number = 0;
  // --- End Layout Worker Pool ---

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
  // private layoutWorkerPromise: Promise<LayoutWorkerInstance> | null = null; // REMOVED - Replaced by layoutWorkerPromises array
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

  // --- Idle Worker Tracking --- >
  private workerIdleTimers = new Map<Worker, NodeJS.Timeout>();
  private workerLastActivity = new Map<Worker, number>();
  private static readonly DEFAULT_IDLE_TIMEOUT_MS = 60000; // 60 seconds

  private constructor() {
    // Initialize queues with desired concurrency
    // Layout and grouping are likely sequential operations affecting the whole view
    this.layoutPoolSize = Math.min(
      2,
      Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 3))
    ); // e.g. max 2, min 1
    this.layoutQueue = new PQueue({ concurrency: this.layoutPoolSize }); // Concurrency matches pool size
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

  // --- Layout Worker Management (Promise-based AND POOLED) --- >
  private async getAvailableLayoutWorker(): Promise<LayoutWorkerInstance> {
    if (this.layoutWorkers.length < this.layoutPoolSize) {
      // Still need to populate the pool up to its configured size
      const workerIndexToInit = this.layoutWorkers.length; // Next available slot

      if (!this.layoutWorkerPromises[workerIndexToInit]) {
        console.log(
          `WorkerPool: Initializing LayoutWorker instance ${workerIndexToInit + 1}/${this.layoutPoolSize}...`
        );
        const promise = this.initializeWorker('layout', LayoutWorker, worker => {
          // Important: setup listeners for THIS SPECIFIC worker instance
          this.setupWorkerMessageHandler(
            worker,
            'layout',
            this.pendingLayoutRequests,
            this.layoutWorkerListeners
          );
          // Add to the live workers array once successfully initialized and listeners set up
          // This ensures it's only added if init didn't throw.
          this.layoutWorkers[workerIndexToInit] = worker;
        }).catch(err => {
          this.layoutWorkerPromises[workerIndexToInit] = null; // Reset promise on failure
          console.error(
            `WorkerPool: Failed to initialize LayoutWorker instance ${workerIndexToInit}.`,
            err
          );
          throw err; // Re-throw error
        });
        this.layoutWorkerPromises[workerIndexToInit] = promise;
        await promise; // Wait for this specific worker to initialize
      }
    }

    // Pool should be populated now, select one via round-robin
    const selectedWorkerIndex = this.nextLayoutWorkerIndex;
    this.nextLayoutWorkerIndex = (this.nextLayoutWorkerIndex + 1) % this.layoutPoolSize;

    let workerInstance = this.layoutWorkers[selectedWorkerIndex];

    if (!workerInstance) {
      // This case should ideally be prevented by the population logic above or if a worker failed catastrophically
      console.error(
        `WorkerPool: LayoutWorker instance ${selectedWorkerIndex} not available after attempting population. Retrying initialization for this slot.`
      );
      // Attempt to re-initialize this specific slot if it's missing.
      // This is a fallback, primary initialization should happen as pool populates.
      this.layoutWorkerPromises[selectedWorkerIndex] = null; // Clear potentially failed promise
      const reinitializedPromise = this.initializeWorker('layout', LayoutWorker, worker => {
        this.setupWorkerMessageHandler(
          worker,
          'layout',
          this.pendingLayoutRequests,
          this.layoutWorkerListeners
        );
        this.layoutWorkers[selectedWorkerIndex] = worker;
      }).catch(err => {
        this.layoutWorkerPromises[selectedWorkerIndex] = null;
        throw err;
      });
      this.layoutWorkerPromises[selectedWorkerIndex] = reinitializedPromise;
      return await reinitializedPromise; // Return the promise for the re-initialized worker
    }

    // Clear idle timer if acquiring an existing worker
    const existingTimer = this.workerIdleTimers.get(workerInstance);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.workerIdleTimers.delete(workerInstance);
      console.log(
        `[WorkerPool] Cleared idle timer for LayoutWorker instance ${selectedWorkerIndex} as it was acquired.`
      );
    }

    return workerInstance;
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
          // No idle timer to clear here as it's freshly initialized
        }
      ).catch(err => {
        this.colorExtractorWorkerPromise = null; // Reset promise on failure
        throw err; // Re-throw error
      });
    } else if (this.colorExtractorWorker) {
      // If promise exists, worker should too. Clear its idle timer if being re-acquired.
      const existingTimer = this.workerIdleTimers.get(this.colorExtractorWorker);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.workerIdleTimers.delete(this.colorExtractorWorker);
        console.log(`[WorkerPool] Cleared idle timer for ColorExtractorWorker as it was acquired.`);
      }
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
        // No idle timer to clear here as it's freshly initialized
      }).catch(err => {
        this.groupingWorkerPromise = null; // Reset promise on failure
        throw err; // Re-throw error
      });
    } else if (this.groupingWorker) {
      // If promise exists, worker should too. Clear its idle timer if being re-acquired.
      const existingTimer = this.workerIdleTimers.get(this.groupingWorker);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.workerIdleTimers.delete(this.groupingWorker);
        console.log(`[WorkerPool] Cleared idle timer for GroupingWorker as it was acquired.`);
      }
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
          request.resolve((data as WorkerResponseMessage<T>).payload);
          // Successfully processed a message, schedule idle check
          this.scheduleGenericIdleCheck(worker, workerType);
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
      pendingRequests.forEach((request, id) => {
        console.warn(
          `[WorkerPool] Rejecting pending request ${id} due to generic ${workerType} worker error.`
        );
        clearTimeout(request.timer);
        request.reject(error);
        // Also clear any idle timer for this worker as it's errored
        const existingTimer = this.workerIdleTimers.get(worker);
        if (existingTimer) {
          clearTimeout(existingTimer);
          this.workerIdleTimers.delete(worker);
        }
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
        getWorkerPromise = this.getAvailableLayoutWorker.bind(this);
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
    // Ensure worker pool initialization is triggered if not already started
    if (this.layoutWorkers.length < this.layoutPoolSize) {
      this.getAvailableLayoutWorker().catch(err =>
        console.error('[WorkerPool] Error ensuring layout worker for listener:', err)
      );
    }
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

    // Clear all idle timers before terminating workers
    this.workerIdleTimers.forEach(timerId => clearTimeout(timerId));
    this.workerIdleTimers.clear();
    this.workerLastActivity.clear();

    // Terminate Layout Workers Pool
    for (let i = 0; i < this.layoutWorkers.length; i++) {
      const worker = this.layoutWorkers[i];
      if (worker) {
        this.terminateWorker(`layout-${i}`, worker); // Pass a unique identifier if needed by terminateWorker
      }
    }
    this.layoutWorkers = [];
    this.layoutWorkerPromises = [];

    // Terminate other single workers
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
      // Explicitly cast to ImageProcessor if type inference is failing
      (this.imageProcessor as any).terminate?.(); // Or (this.imageProcessor as ImageProcessor).terminate?.(); if ImageProcessor type is imported
      this.imageProcessor = null;
    }

    // Clear queues (should be empty after cancelAll, but good practice)
    this.layoutQueue.clear();
    this.groupingQueue.clear();
    this.colorQueue.clear();

    console.log('WorkerPool: Cleanup complete.');
  }

  private terminateWorker(workerType: WorkerType | string, worker: WorkerInstance | null) {
    if (worker) {
      console.log(`WorkerPool: Terminating ${workerType} worker...`);
      const existingTimer = this.workerIdleTimers.get(worker);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.workerIdleTimers.delete(worker);
      }
      this.workerLastActivity.delete(worker); // Also clear last activity record

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

  // --- Idle Worker Termination Logic --- >
  private scheduleGenericIdleCheck(worker: WorkerInstance, workerType: WorkerType | string): void {
    const existingTimer = this.workerIdleTimers.get(worker);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.workerLastActivity.set(worker, Date.now());
    // console.log(`[WorkerPool] Scheduling idle check for ${workerType} worker.`);

    const timerId = setTimeout(() => {
      // Check if still idle: compare lastActivityTime with current time
      const lastActive = this.workerLastActivity.get(worker);
      if (lastActive && Date.now() - lastActive >= WorkerPool.DEFAULT_IDLE_TIMEOUT_MS - 500) {
        // -500ms tolerance
        console.log(`[WorkerPool] Worker ${workerType} instance idle timeout. Terminating.`);
        this.terminateGenericIdleWorker(worker, workerType);
      } else if (lastActive) {
        // Reschedule if it became active briefly or timer fired too early
        // console.log(`[WorkerPool] Worker ${workerType} was active recently or timer misfired. Rescheduling.`);
        this.scheduleGenericIdleCheck(worker, workerType);
      } else {
        // No last activity, but timer fired? Should be rare. Terminate to be safe.
        console.warn(
          `[WorkerPool] Worker ${workerType} timer fired without last activity. Terminating.`
        );
        this.terminateGenericIdleWorker(worker, workerType);
      }
    }, WorkerPool.DEFAULT_IDLE_TIMEOUT_MS);
    this.workerIdleTimers.set(worker, timerId);
  }

  private terminateGenericIdleWorker(
    worker: WorkerInstance,
    workerType: WorkerType | string
  ): void {
    console.log(`[WorkerPool] Attempting to terminate idle worker: ${workerType}`);

    // Call existing terminateWorker which handles worker.terminate() and cleans its own idle timer parts
    this.terminateWorker(workerType, worker);

    // Nullify the main reference to this worker instance and its promise
    // This allows re-initialization on next demand
    if (workerType === 'color' && this.colorExtractorWorker === worker) {
      this.colorExtractorWorker = null;
      this.colorExtractorWorkerPromise = null;
      console.log(`[WorkerPool] ColorExtractorWorker instance nulled out.`);
    } else if (workerType === 'grouping' && this.groupingWorker === worker) {
      this.groupingWorker = null;
      this.groupingWorkerPromise = null;
      console.log(`[WorkerPool] GroupingWorker instance nulled out.`);
    } else {
      // Check if it's a layout worker from the pool
      const layoutWorkerIndex = this.layoutWorkers.indexOf(worker as LayoutWorkerInstance);
      if (layoutWorkerIndex !== -1) {
        // @ts-ignore
        this.layoutWorkers[layoutWorkerIndex] = null;
        this.layoutWorkerPromises[layoutWorkerIndex] = null;
        console.log(`[WorkerPool] LayoutWorker instance at index ${layoutWorkerIndex} nulled out.`);
      } else {
        console.warn(`[WorkerPool] Could not find worker to nullify for type: ${workerType}`);
      }
    }
  }
}

export default WorkerPool;
// Export types needed by consumers
export type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage, WorkerType };
