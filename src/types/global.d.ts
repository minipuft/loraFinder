interface Window {
  mouseX: number;
  mouseY: number;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.worker.ts' {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

// Add other common module declarations
declare module '*.svg' {
  const content: string;
  export default content;
}
