self.onmessage = async e => {
  if ('processImage' === e.data.action) {
    const { id: a, src: t, width: o, height: s } = e.data,
      c = await fetch(t)
        .then(e => e.blob())
        .then(e => createImageBitmap(e)),
      n = new OffscreenCanvas(o / 4, s / 4),
      i = n.getContext('2d');
    if (i) {
      i.drawImage(c, 0, 0, o / 4, s / 4);
      const e = await n.convertToBlob({ type: 'image/jpeg', quality: 0.5 }),
        t = URL.createObjectURL(e);
      self.postMessage({ action: 'imageProcessed', id: a, processedImage: t, quality: 'low' });
      const r = new OffscreenCanvas(o, s),
        g = r.getContext('2d');
      if (g) {
        g.drawImage(c, 0, 0, o, s);
        const e = await r.convertToBlob({ type: 'image/jpeg', quality: 0.9 }),
          t = URL.createObjectURL(e);
        self.postMessage({ action: 'imageProcessed', id: a, processedImage: t, quality: 'high' });
      } else console.error('Failed to get 2D context for full canvas');
    } else console.error('Failed to get 2D context for low-res canvas');
  }
};
//# sourceMappingURL=imageProcessorWorker.DZfM8qIw.js.map
