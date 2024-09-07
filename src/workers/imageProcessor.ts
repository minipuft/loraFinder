import { openDB, IDBPDatabase } from 'idb';

interface ImageProcessorMessage {
  action: 'processImage' | 'processBatch' | 'imageProcessed';
  images?: { id: string; src: string; width: number; height: number }[];
  id?: string;
  processedImage?: string;
}

class ImageProcessor {
  private worker: Worker;
  private db: IDBPDatabase | null = null;
  private messageQueue: ImageProcessorMessage[] = [];
  private isProcessing = false;

  constructor() {
    this.worker = new Worker(new URL('./imageProcessorWorker.ts', import.meta.url));
    this.initDB();
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }

  private async initDB() {
    this.db = await openDB('imageCache', 1, {
      upgrade(db) {
        db.createObjectStore('images');
      },
    });
  }

  private async getCachedImage(id: string): Promise<string | null> {
    if (!this.db) return null;
    return this.db.get('images', id);
  }

  private async cacheImage(id: string, imageData: string) {
    if (!this.db) return;
    await this.db.put('images', imageData, id);
  }

  private async processNextMessage() {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;
    const message = this.messageQueue.shift()!;

    if (message.action === 'processImage' && message.images) {
      await this.processImage(message.images[0]);
    } else if (message.action === 'processBatch' && message.images) {
      await this.processBatch(message.images);
    }

    this.isProcessing = false;
    this.processNextMessage();
  }

  private async processImage(image: { id: string; src: string; width: number; height: number }) {
    const cachedImage = await this.getCachedImage(image.id);
    if (cachedImage) {
      this.postMessage({ action: 'imageProcessed', id: image.id, processedImage: cachedImage });
    } else {
      this.worker.postMessage({ action: 'processImage', ...image });
    }
  }

  private async processBatch(images: { id: string; src: string; width: number; height: number }[]) {
    const uncachedImages = [];
    for (const image of images) {
      const cachedImage = await this.getCachedImage(image.id);
      if (cachedImage) {
        this.postMessage({ action: 'imageProcessed', id: image.id, processedImage: cachedImage });
      } else {
        uncachedImages.push(image);
      }
    }
    if (uncachedImages.length > 0) {
      this.worker.postMessage({ action: 'processBatch', images: uncachedImages });
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    if (event.data.action === 'imageProcessed') {
      this.cacheImage(event.data.id, event.data.processedImage);
      this.postMessage(event.data);
    }
  }

  public postMessage(message: ImageProcessorMessage) {
    this.messageQueue.push(message);
    this.processNextMessage();
  }

  public terminate() {
    this.worker.terminate();
  }
}

export function createImageProcessor() {
  return new ImageProcessor();
}
