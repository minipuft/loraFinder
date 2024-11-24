import { openDB } from 'idb';
class ImageProcessor {
    worker;
    db = null;
    messageQueue = [];
    isProcessing = false;
    constructor() {
        this.worker = new Worker(new URL('./imageProcessorWorker.ts', import.meta.url));
        this.initDB();
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }
    async initDB() {
        this.db = await openDB('imageCache', 1, {
            upgrade(db) {
                db.createObjectStore('images');
            },
        });
    }
    async getCachedImage(id) {
        if (!this.db)
            return null;
        return this.db.get('images', id);
    }
    async cacheImage(id, imageData) {
        if (!this.db)
            return;
        await this.db.put('images', imageData, id);
    }
    async processNextMessage() {
        if (this.isProcessing || this.messageQueue.length === 0)
            return;
        this.isProcessing = true;
        const message = this.messageQueue.shift();
        if (message.action === 'processImage' && message.images) {
            await this.processImage(message.images[0]);
        }
        else if (message.action === 'processBatch' && message.images) {
            await this.processBatch(message.images);
        }
        this.isProcessing = false;
        this.processNextMessage();
    }
    async processImage(image) {
        const cachedImage = await this.getCachedImage(image.id);
        if (cachedImage) {
            this.postMessage({ action: 'imageProcessed', id: image.id, processedImage: cachedImage });
        }
        else {
            this.worker.postMessage({ action: 'processImage', ...image });
        }
    }
    async processBatch(images) {
        const uncachedImages = [];
        for (const image of images) {
            const cachedImage = await this.getCachedImage(image.id);
            if (cachedImage) {
                this.postMessage({ action: 'imageProcessed', id: image.id, processedImage: cachedImage });
            }
            else {
                uncachedImages.push(image);
            }
        }
        if (uncachedImages.length > 0) {
            this.worker.postMessage({ action: 'processBatch', images: uncachedImages });
        }
    }
    handleWorkerMessage(event) {
        if (event.data.action === 'imageProcessed') {
            this.cacheImage(event.data.id, event.data.processedImage);
            this.postMessage(event.data);
        }
    }
    postMessage(message) {
        this.messageQueue.push(message);
        this.processNextMessage();
    }
    terminate() {
        this.worker.terminate();
    }
}
export function createImageProcessor() {
    return new ImageProcessor();
}
//# sourceMappingURL=imageProcessor.js.map