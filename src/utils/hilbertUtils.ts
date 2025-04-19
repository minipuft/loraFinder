import { ImageInfo } from '../types';

export interface HilbertLayoutItem {
  image: ImageInfo;
  top: number;
  left: number;
  width: number;
  height: number;
}

// --- Hilbert Curve Generation (Simplified & adapted from various sources) ---

// Function to convert Hilbert index (d) to 2D coordinates (x, y) for a given order n
function d2xy(n: number, d: number): [number, number] {
  let x = 0;
  let y = 0;
  let t = d;
  for (let s = 1; s < n; s <<= 1) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    [x, y] = rot(s, x, y, rx, ry);
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return [x, y];
}

// Rotate/flip a quadrant appropriately
function rot(n: number, x: number, y: number, rx: number, ry: number): [number, number] {
  if (ry === 0) {
    if (rx === 1) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    // Swap x and y
    return [y, x];
  }
  return [x, y];
}

// --- Layout Calculation ---

const GAP = 5; // Gap between images in pixels
const TARGET_SEGMENT_DIMENSION = 150; // Initial target dimension for scaling

/**
 * Calculates the layout (position and dimensions) for images along a Hilbert curve path.
 */
export function calculateHilbertLayout(
  images: ImageInfo[],
  containerWidth: number, // Currently unused, layout drives container size
  zoom: number // Applied to target dimension
): HilbertLayoutItem[] {
  if (!images || images.length === 0) {
    return [];
  }

  const n_images = images.length;
  // Determine the order of the Hilbert curve needed
  // Order n curve fits 2^(2n) points. Find smallest n such that 4^n >= n_images
  const order = Math.max(1, Math.ceil(Math.log2(Math.sqrt(n_images)) / 2) * 2); // Ensure order is even? Check Hilbert theory.
  // Simplified: Use order based on sqrt, minimum 1
  const curveOrder = Math.max(1, Math.ceil(Math.log2(n_images) / 2));
  const gridSize = 1 << curveOrder; // 2^order
  const totalPoints = gridSize * gridSize; // 4^order

  // Generate Hilbert curve coordinates for each image index
  const points = images.map((_, index) => {
    // Map image index to a point on the curve (distribute images along the curve)
    const hilbertIndex = Math.floor((index / n_images) * totalPoints);
    return d2xy(gridSize, Math.min(hilbertIndex, totalPoints - 1)); // Get coords for this point
  });

  const layoutItems: HilbertLayoutItem[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxX = 0;
  let maxY = 0;
  const targetDim = TARGET_SEGMENT_DIMENSION * zoom;

  // Simple sequential placement for now - NOT YET following curve path strictly
  // This is a placeholder for the actual path-following logic
  // TODO: Implement proper path following based on `points` differences
  console.warn(
    'Hilbert path following logic not fully implemented. Using basic sequential layout.'
  );

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img || !img.width || !img.height) continue; // Skip invalid images

    const aspectRatio = img.width / img.height;
    let itemWidth = targetDim;
    let itemHeight = targetDim / aspectRatio;

    // Basic flow: Add right, if exceeds containerWidth (placeholder), move down
    if (currentX + itemWidth > containerWidth && i > 0) {
      currentY = maxY + GAP;
      currentX = 0;
    }

    layoutItems.push({
      image: img,
      top: currentY,
      left: currentX,
      width: itemWidth,
      height: itemHeight,
    });

    // Update current position and max dimensions
    currentX += itemWidth + GAP;
    maxX = Math.max(maxX, currentX);
    maxY = Math.max(maxY, currentY + itemHeight);
  }

  // // TODO: Implement actual Hilbert path traversal and positioning logic
  // // This would involve iterating through `points`, calculating the direction
  // // between points[i] and points[i+1], and placing the image along that segment,
  // // adjusting size based on aspect ratio and target segment length/width.
  // const scaleFactor = (containerWidth || 1000) / gridSize; // Example scaling
  // points.forEach(([hx, hy], index) => {
  //     const img = images[index];
  //     if (!img || !img.width || !img.height) return;
  //     const aspectRatio = img.width / img.height;
  //     // Dummy placement based on Hilbert coords - needs refinement
  //     const itemWidth = scaleFactor * zoom;
  //     const itemHeight = (scaleFactor / aspectRatio) * zoom;
  //     layoutItems.push({
  //         image: img,
  //         top: hy * scaleFactor * zoom, // Rough positioning
  //         left: hx * scaleFactor * zoom,
  //         width: itemWidth,
  //         height: itemHeight,
  //     });
  // });

  return layoutItems;
}

// Deprecated: generateHilbertPath - logic is integrated into calculateHilbertLayout
// export function generateHilbertPath(itemCount: number): string[] { ... }
