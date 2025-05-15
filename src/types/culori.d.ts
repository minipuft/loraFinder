declare module 'culori' {
  export type ColorMode =
    | 'rgb'
    | 'hsl'
    | 'hsv'
    | 'hwb'
    | 'lab'
    | 'lch'
    | 'oklab'
    | 'oklch'
    | string;

  export interface ColorObject {
    mode: ColorMode;
    r?: number;
    g?: number;
    b?: number;
    h?: number;
    s?: number;
    l?: number;
    v?: number;
    w?: number;
    // For Lab/LCH/OKLab/OKLCH
    a?: number;
    c?: number;
    alpha?: number;
    // Add other channel properties as needed
    [key: string]: any; // Allow other properties
  }

  export type Color = ColorObject | string;

  export function parse(color: string): ColorObject | undefined;

  export function converter(mode: ColorMode): (color: Color) => ColorObject;

  export function formatHex(color: Color): string;

  export function clampRgb(color: Color): ColorObject;
  // Add other functions used from 'culori' main entry point if any
}

declare module 'culori/fn' {
  import { ColorObject } from 'culori'; // Import from the main module declaration

  export const modeRgb: ColorObject; // Approximation, actual type might be more specific
  export const modeOklab: ColorObject;
  export const modeOklch: ColorObject;
  // Add other mode definitions as needed
  // Potentially, these are not ColorObjects themselves but definitions that converter uses.
  // For simplicity, using ColorObject, but a more accurate type would be a mode definition object.
  // For now, this should satisfy the TS compiler for their usage with converter().
}
