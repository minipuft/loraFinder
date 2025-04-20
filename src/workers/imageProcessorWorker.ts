// Add a flag to track cancellation state
let isCancelled = false;

self.onmessage = async event => {
  // Reset cancellation flag on new processing requests
  if (event.data.action === 'processImage' || event.data.action === 'processBatch') {
    isCancelled = false;
  }

  // Handle cancellation message
  if (event.data.action === 'cancel') {
    isCancelled = true;
    // Optionally, add logic here to try and abort ongoing fetch/canvas operations if possible,
    // but it's complex. Setting the flag might be sufficient for now.
    console.log('Worker: Cancellation requested.');
    return; // Stop further processing in this message handler
  }

  // --- Existing processing logic ---
  if (event.data.action === 'processImage') {
    // Check cancellation flag before starting
    if (isCancelled) {
      console.log('Worker: Skipping processImage due to cancellation.');
      return;
    }
    const { id, src, width, height } = event.data;

    try {
      // Wrap in try-catch for better error handling during fetch/processing
      // Load the image
      const img = await fetch(src)
        .then(res => res.blob())
        .then(blob => createImageBitmap(blob));

      // Check cancellation flag again after await
      if (isCancelled) {
        console.log('Worker: Cancelling processImage mid-fetch.');
        return;
      }

      // Create low-res
      const lowResWidth = Math.round(width / 4);
      const lowResHeight = Math.round(height / 4);
      const canvas = new OffscreenCanvas(lowResWidth, lowResHeight);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, lowResWidth, lowResHeight);
        const lowResBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });

        // Check cancellation flag again after await
        if (isCancelled) {
          console.log('Worker: Cancelling processImage before sending low-res.');
          return;
        }

        const lowResUrl = URL.createObjectURL(lowResBlob);

        // Send low-res, INCLUDING the dimensions it was generated for
        self.postMessage({
          action: 'imageProcessed',
          id,
          processedImage: lowResUrl,
          quality: 'low',
          width: lowResWidth,
          height: lowResHeight,
        });

        // Process the full-resolution image
        const fullCanvas = new OffscreenCanvas(width, height);
        const fullCtx = fullCanvas.getContext('2d');
        if (fullCtx) {
          fullCtx.drawImage(img, 0, 0, width, height);
          const fullBlob = await fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });

          // Check cancellation flag again after await
          if (isCancelled) {
            console.log('Worker: Cancelling processImage before sending high-res.');
            return;
          }

          const fullUrl = URL.createObjectURL(fullBlob);

          // Send high-res, INCLUDING the dimensions it was generated for
          self.postMessage({
            action: 'imageProcessed',
            id,
            processedImage: fullUrl,
            quality: 'high',
            width: width,
            height: height,
          });
        } else {
          console.error('Failed to get 2D context for full canvas');
        }
      } else {
        console.error('Failed to get 2D context for low-res canvas');
      }
    } catch (error) {
      // Handle fetch or processing errors
      if (!isCancelled) {
        // Don't log errors if cancellation was the cause
        console.error(`Error processing image ${id}:`, error);
      } else {
        console.log(`Processing cancelled for image ${id}.`);
      }
    }
  } else if (event.data.action === 'processBatch') {
    // Add handling for batch processing cancellation
    // Check cancellation flag before starting batch
    if (isCancelled) {
      console.log('Worker: Skipping processBatch due to cancellation.');
      return;
    }
    const { images } = event.data;
    console.log(`Worker: Starting batch processing for ${images.length} images.`);

    // Process images sequentially for simplicity, checking cancellation between each
    for (const image of images) {
      // Check cancellation flag before processing each image in the batch
      if (isCancelled) {
        console.log(`Worker: Cancelling batch processing mid-way (at image ${image.id}).`);
        return; // Exit the loop and stop processing the batch
      }

      const { id, src, width, height } = image;
      try {
        // Load the image
        const img = await fetch(src)
          .then(res => res.blob())
          .then(blob => createImageBitmap(blob));

        // Check cancellation flag again after await
        if (isCancelled) {
          console.log(`Worker: Cancelling batch processing during fetch for image ${id}.`);
          return;
        }

        // Create low-res
        const lowResWidth = Math.round(width / 4);
        const lowResHeight = Math.round(height / 4);
        const canvas = new OffscreenCanvas(lowResWidth, lowResHeight);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, lowResWidth, lowResHeight);
          const lowResBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });

          // Check cancellation flag again after await
          if (isCancelled) {
            console.log(
              `Worker: Cancelling batch processing before sending low-res for image ${id}.`
            );
            return;
          }

          const lowResUrl = URL.createObjectURL(lowResBlob);
          // Send low-res with dimensions
          self.postMessage({
            action: 'imageProcessed',
            id,
            processedImage: lowResUrl,
            quality: 'low',
            width: lowResWidth,
            height: lowResHeight,
          });

          // Create high-res
          const fullCanvas = new OffscreenCanvas(width, height);
          const fullCtx = fullCanvas.getContext('2d');
          if (fullCtx) {
            fullCtx.drawImage(img, 0, 0, width, height);
            const fullBlob = await fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });

            // Check cancellation flag again after await
            if (isCancelled) {
              console.log(
                `Worker: Cancelling batch processing before sending high-res for image ${id}.`
              );
              return;
            }

            const fullUrl = URL.createObjectURL(fullBlob);
            // Send high-res with dimensions
            self.postMessage({
              action: 'imageProcessed',
              id,
              processedImage: fullUrl,
              quality: 'high',
              width: width,
              height: height,
            });
          } else {
            console.error(`Failed to get 2D context for full canvas (image ${id})`);
          }
        } else {
          console.error(`Failed to get 2D context for low-res canvas (image ${id})`);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(`Error processing image ${id} in batch:`, error);
        } else {
          console.log(`Batch processing cancelled for image ${id}.`);
          return; // Stop the batch if cancelled during an error
        }
        // Optionally continue to the next image in the batch even if one fails?
        // For now, we continue.
      }
    }
    console.log(`Worker: Finished batch processing.`);
  }
};
