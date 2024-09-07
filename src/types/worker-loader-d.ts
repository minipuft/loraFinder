declare module 'worker-loader' {
  class Worker extends globalThis.Worker {
    constructor(stringUrl: string, options?: WorkerOptions);
  }
  export = Worker;
}
