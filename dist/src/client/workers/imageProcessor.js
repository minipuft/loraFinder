import { openDB } from "idb";
import { getCachedImages, setCachedImages, isCached, } from "../../shared/lib/imageCache";
class ImageProcessor {
    worker;
    db = null;
    messageQueue = [];
    isProcessing = false;
    constructor() {
        this.worker = new Worker(new URL("./imageProcessorWorker.ts", import.meta.url), { type: "module" });
        this.initDB();
        this.worker.onmessage = this.handleWorkerMessage.bind(this);
    }
    async initDB() {
        this.db = await openDB("imageCache", 1, {
            upgrade(db) {
                db.createObjectStore("images");
            },
        });
    }
    async getCachedImage(id) {
        if (!this.db)
            return null;
        return this.db.get("images", id);
    }
    async cacheImage(id, imageData) {
        if (!this.db)
            return;
        await this.db.put("images", imageData, id);
    }
    async processNextMessage() {
        if (this.isProcessing || this.messageQueue.length === 0)
            return;
        this.isProcessing = true;
        const message = this.messageQueue.shift();
        if (message.action === "processImage" && "images" in message) {
            await this.processImage(message.images[0]);
        }
        else if (message.action === "processBatch" && "images" in message) {
            await this.processBatch(message.images);
        }
        this.isProcessing = false;
        this.processNextMessage();
    }
    async processImage(image) {
        const cachedImage = await this.getCachedImage(image.id);
        if (cachedImage) {
            this.postMessage({
                action: "imageProcessed",
                id: image.id,
                processedImage: cachedImage,
                folder: image.folder,
            });
        }
        else {
            this.worker.postMessage({ action: "processImage", ...image });
        }
    }
    async processBatch(images) {
        const uncachedImages = [];
        const cachedResults = [];
        for (const image of images) {
            if (isCached(image.folder, image.id)) {
                const cachedImage = await this.getCachedImage(image.id);
                if (cachedImage) {
                    cachedResults.push({
                        action: "imageProcessed",
                        id: image.id,
                        processedImage: cachedImage,
                        folder: image.folder,
                    });
                }
                else {
                    uncachedImages.push(image);
                }
            }
            else {
                uncachedImages.push(image);
            }
        }
        // Send cached results immediately
        cachedResults.forEach((result) => this.postMessage(result));
        if (uncachedImages.length > 0) {
            this.worker.postMessage({
                action: "processBatch",
                images: uncachedImages,
            });
        }
    }
    handleWorkerMessage(event) {
        if (event.data.action === "imageProcessed") {
            this.cacheImage(event.data.id, event.data.processedImage);
            this.postMessage(event.data);
            // Update the image cache
            const cachedImages = getCachedImages(event.data.folder) || [];
            const updatedImages = cachedImages.map((img) => img.id === event.data.id
                ? { ...img, processedImage: event.data.processedImage }
                : img);
            setCachedImages(event.data.folder, updatedImages);
        }
        else if (event.data.action === "batchProcessed") {
            event.data.results.forEach((result) => {
                this.cacheImage(result.id, result.processedImage);
                this.postMessage({
                    action: "imageProcessed",
                    id: result.id,
                    processedImage: result.processedImage,
                    folder: result.folder,
                });
                // Update the image cache
                const cachedImages = getCachedImages(result.folder) || [];
                const updatedImages = cachedImages.map((img) => img.id === result.id
                    ? { ...img, processedImage: result.processedImage }
                    : img);
                setCachedImages(result.folder, updatedImages);
            });
        }
    }
    postMessage(message) {
        if (message.action === "processBatch") {
            this.messageQueue.push(message);
            this.processNextMessage();
        }
        else if (message.action === "processImage") {
            this.messageQueue.push(message);
            this.processNextMessage();
        }
        else {
            // For "imageProcessed" action, directly emit the result
            if (this.onMessage) {
                this.onMessage(message);
            }
        }
    }
    onMessage = null;
    terminate() {
        this.worker.terminate();
    }
}
export function createImageProcessor() {
    return new ImageProcessor();
}
//# sourceMappingURL=imageProcessor.js.map