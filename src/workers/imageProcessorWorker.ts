self.onmessage = async (event) => {
  if (event.data.action === 'processImage') {
    const { id, src, width, height } = event.data;
    
    // Load the image
    const img = await fetch(src).then(res => res.blob()).then(blob => createImageBitmap(blob));
    
    // Create a low-resolution version
    const canvas = new OffscreenCanvas(width / 4, height / 4);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width / 4, height / 4);
      const lowResBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
      const lowResUrl = URL.createObjectURL(lowResBlob);
      
      // Send the low-res version immediately
      self.postMessage({ action: 'imageProcessed', id, processedImage: lowResUrl, quality: 'low' });
      
      // Process the full-resolution image
      const fullCanvas = new OffscreenCanvas(width, height);
      const fullCtx = fullCanvas.getContext('2d');
      if (fullCtx) {
        fullCtx.drawImage(img, 0, 0, width, height);
        const fullBlob = await fullCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        const fullUrl = URL.createObjectURL(fullBlob);
        
        // Send the full-res version
        self.postMessage({ action: 'imageProcessed', id, processedImage: fullUrl, quality: 'high' });
      } else {
        console.error('Failed to get 2D context for full canvas');
      }
    } else {
      console.error('Failed to get 2D context for low-res canvas');
    }
  }
};
