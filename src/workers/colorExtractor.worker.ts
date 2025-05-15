// src/workers/colorExtractor.worker.ts

// Import the shared types from WorkerPool
import type { WorkerErrorMessage, WorkerRequestMessage, WorkerResponseMessage } from './workerPool';
// Import culori functions
import { clampRgb, converter, formatHex } from 'culori';

// Type for OKLCH color objects for internal use
type OklchColorObject = { mode: 'oklch'; l: number; c: number; h: number; alpha?: number };
type RgbColorObject = { mode: 'rgb'; r: number; g: number; b: number; alpha?: number };

// --- Types specific to this worker's payload ---
interface ColorRequestPayload {
  id: string; // Unique ID of the image being processed
  src: string; // URL or path to the image
}

// Define the new palette structure
interface ImagePalette {
  base: string; // hex
  complementary: string; // hex
  // accent1?: string;     // hex - Will be added in a later phase
  // accent2?: string;     // hex - Will be added in a later phase
}

interface ColorResultPayload {
  // Updated
  id: string; // Original image ID
  palette: ImagePalette | null; // Changed from 'color: string | null'
}

// Type aliases for the full message structures
type ColorRequest = WorkerRequestMessage<ColorRequestPayload>;
type ColorResponse = WorkerResponseMessage<ColorResultPayload>; // Updated
type ColorErrorResponse = WorkerErrorMessage;

// Create converters by passing the mode string directly
const oklchConverter = converter('oklch');
const rgbConverter = converter('rgb');

// Helper to process an OKLCH color object to HEX, including L/C adjustments and clamping
function processOklchToHex(
  oklchInput: OklchColorObject,
  isComplementaryStyle: boolean = false // Flag to apply slightly different L/C for complementary
): string | null {
  let { l, c, h, alpha } = oklchInput;

  // --- L/C ADJUSTMENT ---
  const MIN_LIGHTNESS = 0.35;
  const TARGET_LIGHTNESS_LOW = 0.45;
  const MAX_LIGHTNESS = 0.85;
  const TARGET_LIGHTNESS_HIGH = 0.75;
  const MIN_CHROMA = 0.03;
  let TARGET_CHROMA_LOW = 0.05;
  let CHROMA_BOOST_FACTOR = 1.15;
  const CHROMA_REDUCTION_FACTOR_IF_L_ADJUSTED = 0.9;
  let MAX_CHROMA = 0.28;
  let lAdjusted = false;

  // Defaults
  l = typeof l === 'number' ? l : 0.5;
  c = typeof c === 'number' ? c : 0.1;
  h = typeof h === 'number' ? h : 0;
  alpha = typeof alpha === 'number' ? alpha : 1;

  if (isComplementaryStyle) {
    // For complementary, we might want less aggressive boosting or different targets
    TARGET_CHROMA_LOW = 0.04;
    CHROMA_BOOST_FACTOR = 1.05; // Less boost
    MAX_CHROMA = 0.25;
    // Keep lightness targets, or adjust if needed for complementary
  }

  if (l < MIN_LIGHTNESS) {
    l = TARGET_LIGHTNESS_LOW;
    lAdjusted = true;
  } else if (l > MAX_LIGHTNESS) {
    l = TARGET_LIGHTNESS_HIGH;
    lAdjusted = true;
  }

  if (c < MIN_CHROMA) {
    c = TARGET_CHROMA_LOW;
  } else {
    c *= CHROMA_BOOST_FACTOR;
  }

  if (lAdjusted) {
    c *= CHROMA_REDUCTION_FACTOR_IF_L_ADJUSTED;
  }
  c = Math.min(c, MAX_CHROMA);

  const finalAdjustedOklch: OklchColorObject = { mode: 'oklch', l, c, h, alpha };
  // --- END L/C ADJUSTMENT ---

  let finalRgbColorIntermediate = rgbConverter(finalAdjustedOklch);
  if (
    !finalRgbColorIntermediate ||
    typeof finalRgbColorIntermediate !== 'object' ||
    !('mode' in finalRgbColorIntermediate)
  ) {
    console.warn(
      '[ColorExtractorWorker] Failed to convert adjusted OKLCH to RGB or invalid object'
    );
    return null; // Cannot proceed from here
  }
  const finalRgbColor = finalRgbColorIntermediate as RgbColorObject;

  const clampedRgbColorIntermediate = clampRgb(finalRgbColor);
  if (
    !clampedRgbColorIntermediate ||
    typeof clampedRgbColorIntermediate !== 'object' ||
    !('mode' in clampedRgbColorIntermediate)
  ) {
    console.warn('[ColorExtractorWorker] Failed to clamp RGB color or invalid object');
    return null; // Cannot proceed
  }
  const clampedRgbColor = clampedRgbColorIntermediate as RgbColorObject;

  return formatHex(clampedRgbColor);
}

// Refactored: Processes RGB to HEX and also returns the adjusted OKLCH object
function processRgbToOklchAndHex(rgbColorInput: RgbColorObject): {
  hex: string | null;
  oklchAdjusted: OklchColorObject | null;
} {
  let oklchColorIntermediate = oklchConverter(rgbColorInput);

  if (
    !oklchColorIntermediate ||
    typeof oklchColorIntermediate !== 'object' ||
    !('mode' in oklchColorIntermediate)
  ) {
    console.warn(
      '[ColorExtractorWorker] Failed to convert RGB to OKLCH or invalid color object returned'
    );
    const rHex = Math.round(rgbColorInput.r * 255)
      .toString(16)
      .padStart(2, '0');
    const gHex = Math.round(rgbColorInput.g * 255)
      .toString(16)
      .padStart(2, '0');
    const bHex = Math.round(rgbColorInput.b * 255)
      .toString(16)
      .padStart(2, '0');
    return { hex: `#${rHex}${gHex}${bHex}`, oklchAdjusted: null };
  }
  const initialOklch = oklchColorIntermediate as OklchColorObject;

  // Perform L/C adjustments (similar to what was in processOklchToHex, but now it's part of this flow)
  let { l, c, h, alpha } = initialOklch;
  const MIN_LIGHTNESS = 0.35;
  const TARGET_LIGHTNESS_LOW = 0.45;
  const MAX_LIGHTNESS = 0.85;
  const TARGET_LIGHTNESS_HIGH = 0.75;
  const MIN_CHROMA = 0.03;
  const TARGET_CHROMA_LOW = 0.05;
  const CHROMA_BOOST_FACTOR = 1.15;
  const CHROMA_REDUCTION_FACTOR_IF_L_ADJUSTED = 0.9;
  const MAX_CHROMA = 0.28;
  let lAdjusted = false;

  l = typeof l === 'number' ? l : 0.5;
  c = typeof c === 'number' ? c : 0.1;
  h = typeof h === 'number' ? h : 0;
  alpha = typeof alpha === 'number' ? alpha : 1;

  if (l < MIN_LIGHTNESS) {
    l = TARGET_LIGHTNESS_LOW;
    lAdjusted = true;
  } else if (l > MAX_LIGHTNESS) {
    l = TARGET_LIGHTNESS_HIGH;
    lAdjusted = true;
  }

  if (c < MIN_CHROMA) {
    c = TARGET_CHROMA_LOW;
  } else {
    c *= CHROMA_BOOST_FACTOR;
  }

  if (lAdjusted) {
    c *= CHROMA_REDUCTION_FACTOR_IF_L_ADJUSTED;
  }
  c = Math.min(c, MAX_CHROMA);

  const finalAdjustedOklch: OklchColorObject = { mode: 'oklch', l, c, h, alpha };

  // Now convert this finalAdjustedOklch to HEX for the 'hex' part of the return
  let finalRgbColorIntermediate = rgbConverter(finalAdjustedOklch);
  if (
    !finalRgbColorIntermediate ||
    typeof finalRgbColorIntermediate !== 'object' ||
    !('mode' in finalRgbColorIntermediate)
  ) {
    // Fallback for hex if conversion fails
    const rHex = Math.round(rgbColorInput.r * 255)
      .toString(16)
      .padStart(2, '0');
    const gHex = Math.round(rgbColorInput.g * 255)
      .toString(16)
      .padStart(2, '0');
    const bHex = Math.round(rgbColorInput.b * 255)
      .toString(16)
      .padStart(2, '0');
    return { hex: `#${rHex}${gHex}${bHex}`, oklchAdjusted: finalAdjustedOklch }; // Still return the oklch
  }
  const finalRgb = finalRgbColorIntermediate as RgbColorObject;

  const clampedRgbIntermediate = clampRgb(finalRgb);
  if (
    !clampedRgbIntermediate ||
    typeof clampedRgbIntermediate !== 'object' ||
    !('mode' in clampedRgbIntermediate)
  ) {
    const rHex = Math.round(rgbColorInput.r * 255)
      .toString(16)
      .padStart(2, '0');
    const gHex = Math.round(rgbColorInput.g * 255)
      .toString(16)
      .padStart(2, '0');
    const bHex = Math.round(rgbColorInput.b * 255)
      .toString(16)
      .padStart(2, '0');
    return { hex: `#${rHex}${gHex}${bHex}`, oklchAdjusted: finalAdjustedOklch };
  }
  const clampedRgb = clampedRgbIntermediate as RgbColorObject;

  return { hex: formatHex(clampedRgb), oklchAdjusted: finalAdjustedOklch };
}

/**
 * Extracts a dominant color palette from an image fetched from a URL.
 */
async function extractImagePalette(srcUrl: string): Promise<ImagePalette | null> {
  try {
    const response = await fetch(srcUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    const smallSize = 10;
    const canvas = new OffscreenCanvas(smallSize, smallSize);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get OffscreenCanvas context');

    ctx.drawImage(bitmap, 0, 0, smallSize, smallSize);
    bitmap.close();

    const imageData = ctx.getImageData(0, 0, smallSize, smallSize);
    const data = imageData.data;
    let rSum = 0,
      gSum = 0,
      bSum = 0,
      count = 0;
    let firstDistinctRgbTyped: RgbColorObject | null = null;
    const MIN_DISTINCT_CHANNEL_DIFF = 30;
    const MIN_RGB_SUM_FOR_DISTINCT = 50;
    const MAX_RGB_SUM_FOR_DISTINCT = 255 * 3 - 50;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
      if (!firstDistinctRgbTyped) {
        const rgbSum = r + g + b;
        if (
          rgbSum > MIN_RGB_SUM_FOR_DISTINCT &&
          rgbSum < MAX_RGB_SUM_FOR_DISTINCT &&
          (Math.abs(r - g) > MIN_DISTINCT_CHANNEL_DIFF / 3 ||
            Math.abs(r - b) > MIN_DISTINCT_CHANNEL_DIFF / 3 ||
            Math.abs(g - b) > MIN_DISTINCT_CHANNEL_DIFF / 3)
        ) {
          firstDistinctRgbTyped = { mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 };
        }
      }
    }

    if (count === 0) return null;
    const avgR_255 = Math.round(rSum / count);
    const avgG_255 = Math.round(gSum / count);
    const avgB_255 = Math.round(bSum / count);
    const averageRgbTyped: RgbColorObject = {
      mode: 'rgb',
      r: avgR_255 / 255,
      g: avgG_255 / 255,
      b: avgB_255 / 255,
    };
    const baseInitialRgbTyped: RgbColorObject = firstDistinctRgbTyped || averageRgbTyped;

    const baseProcessingResult = processRgbToOklchAndHex(baseInitialRgbTyped);
    const baseHex = baseProcessingResult.hex;
    const baseOklchAdjusted = baseProcessingResult.oklchAdjusted;

    let complementaryHex: string | null = null;

    if (baseOklchAdjusted) {
      const complementaryHue = (baseOklchAdjusted.h + 180) % 360;
      const complementaryInitialOklch: OklchColorObject = {
        mode: 'oklch',
        l: baseOklchAdjusted.l, // Keep similar lightness
        c: Math.min(baseOklchAdjusted.c * 0.8, 0.12), // Aim for slightly less or moderate chroma for complementary
        h: complementaryHue,
        alpha: baseOklchAdjusted.alpha,
      };
      // Process this new OKLCH for complementary, possibly with different L/C style
      complementaryHex = processOklchToHex(complementaryInitialOklch, true);
    }

    // Fallback for complementary if generation failed
    if (!complementaryHex) {
      const averageProcessingResult = processRgbToOklchAndHex(averageRgbTyped);
      complementaryHex = averageProcessingResult.hex; // Use processed average as fallback
    }

    if (!baseHex || !complementaryHex) {
      console.error(
        '[ColorExtractorWorker] Failed to generate hex for base or final complementary color.'
      );
      return null;
    }

    return { base: baseHex, complementary: complementaryHex };
  } catch (error) {
    console.error(`[ColorExtractorWorker] Error processing image ${srcUrl}:`, error);
    return null;
  }
}

// --- Worker Message Handling ---
self.onmessage = async (event: MessageEvent<ColorRequest>) => {
  const { type, payload, requestId } = event.data;

  if (type !== 'extractColor') {
    console.warn(`[ColorExtractorWorker] Received unexpected message type: ${type}`);
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: `Unexpected message type: ${type}`,
      requestId: requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  const { id, src } = payload;
  if (!id || !src || !requestId) {
    console.error(
      '[ColorExtractorWorker] Invalid data received (missing id, src, or requestId):',
      event.data
    );
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: 'Invalid data received (missing id, src, or requestId)',
      requestId: requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    const palette = await extractImagePalette(src);

    const resultPayload: ColorResultPayload = { id, palette };
    const response: ColorResponse = {
      type: 'colorResult',
      payload: resultPayload,
      requestId: requestId,
    };
    self.postMessage(response);
  } catch (error) {
    console.error(
      `[ColorExtractorWorker] Error processing image for request ${requestId} (ID: ${id}):`,
      error
    );
    const errorResponse: ColorErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
      requestId: requestId,
    };
    self.postMessage(errorResponse);
  }
};

console.log(
  '[ColorExtractorWorker] Initialized and ready for requests (v4.1 - Palette Phase 2 - True Complementary).'
);

// Generic error handler
self.onerror = event => {
  console.error('[ColorExtractorWorker] Unhandled error:', event);
};

export {}; // Make this a module
