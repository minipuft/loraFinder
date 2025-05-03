// src/utils/intersectionUtils.ts

// Basic rectangle interface matching DOMRect properties we need
export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  // Optional: Add bottom and right if needed later
  // bottom: number;
  // right: number;
}

/**
 * Computes the intersection area percentage of the dragRect relative to itself.
 * @param dragRect The bounding rectangle of the element being dragged.
 * @param targetRect The bounding rectangle of the potential target area (e.g., a row).
 * @returns The percentage (0 to 1) of the dragRect's area that overlaps with the targetRect.
 */
export function getIntersectionRatio(dragRect: Rect, targetRect: Rect): number {
  const overlapX = Math.max(
    0,
    Math.min(dragRect.left + dragRect.width, targetRect.left + targetRect.width) -
      Math.max(dragRect.left, targetRect.left)
  );

  const overlapY = Math.max(
    0,
    Math.min(dragRect.top + dragRect.height, targetRect.top + targetRect.height) -
      Math.max(dragRect.top, targetRect.top)
  );

  const overlapArea = overlapX * overlapY;
  const dragArea = dragRect.width * dragRect.height;

  // Avoid division by zero if dragRect has no area
  return dragArea > 0 ? overlapArea / dragArea : 0;
}

/**
 * Determines the best target row based on intersection ratio.
 * @param dragRect The bounding rectangle of the element being dragged.
 * @param rowRects A map where keys are row identifiers (e.g., row index or first image ID) and values are their Rects.
 * @param threshold Minimum intersection ratio (0 to 1) required to consider a row a target.
 * @returns The identifier (key from rowRects) of the row with the highest intersection ratio above the threshold, or null if none meet the threshold.
 */
export function findBestIntersectingRow(
  dragRect: Rect,
  rowRects: Map<string | number, Rect>,
  threshold: number = 0.25 // Default to 25% overlap required
): string | number | null {
  let bestTargetId: string | number | null = null;
  let maxRatio = threshold; // Initialize maxRatio with the threshold

  rowRects.forEach((rect, rowId) => {
    const ratio = getIntersectionRatio(dragRect, rect);
    if (ratio > maxRatio) {
      maxRatio = ratio;
      bestTargetId = rowId;
    }
  });

  return bestTargetId;
}
