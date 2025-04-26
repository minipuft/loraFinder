/// <reference types="vite/client" />

declare module '*.worker.ts?worker' {
  // You can specify the correct worker constructor signature here
  // if you need tighter type checking for the constructor arguments.
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}
