export interface MessageEventHandler {
    (event: MessageEvent): void;
  }
  
  export function createWorker(messageEventHandler: MessageEventHandler): Worker {
    const worker = new Worker(new URL('../../assets/worker.js', import.meta.url), {
      type: 'module'
    });
    // Listen for messages from the Web Worker.
    worker.addEventListener('message', messageEventHandler);
    return worker;
  }
  