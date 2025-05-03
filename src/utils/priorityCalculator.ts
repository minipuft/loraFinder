// src/utils/priorityCalculator.ts
// Calculate Euclidean distance between image center and feed center as priority (lower = higher priority)

export interface LayoutRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function calculatePriority(layoutRect: LayoutRect, feedCenter: Point): number {
  const imageCenterX = layoutRect.left + layoutRect.width / 2;
  const imageCenterY = layoutRect.top + layoutRect.height / 2;

  const dx = imageCenterX - feedCenter.x;
  const dy = imageCenterY - feedCenter.y;

  // Euclidean distance squared (avoid sqrt for performance if relative comparison only)
  return dx * dx + dy * dy;
}
