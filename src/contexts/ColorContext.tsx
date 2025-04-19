import React, { createContext, ReactNode, useCallback, useMemo, useState } from 'react';

// Define hover state structure
interface HoverState {
  isHovering: boolean;
  position: { x: number; y: number } | null; // Normalized coordinates [0, 1] relative to background
  color: string | null; // Optional: Dominant color of hovered item
}

// Define the shape of the context data
interface ColorContextProps {
  // Store maybe 1 or 2 dominant colors. Using string[] for flexibility.
  dominantColors: string[];
  setDominantColors: (colors: string[]) => void;
  // Add hover state
  hoverState: HoverState;
  setHoverState: (newState: Partial<HoverState>) => void; // Allow partial updates
}

// Default initial background color (dark blueish)
const initialDefaultColor = '#041024';

// Initial hover state
const initialHoverState: HoverState = {
  isHovering: false,
  position: null,
  color: null,
};

// Create the context with a default value
export const ColorContext = createContext<ColorContextProps>({
  dominantColors: [initialDefaultColor],
  setDominantColors: () => {}, // No-op function as default
  hoverState: initialHoverState,
  setHoverState: () => {}, // No-op
});

// Create the provider component
interface ColorProviderProps {
  children: ReactNode;
}

export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [dominantColors, setDominantColorsState] = useState<string[]>([initialDefaultColor]);
  const [hoverState, setHoverStateInternal] = useState<HoverState>(initialHoverState);

  // Create a stable setter function that allows partial updates
  const setHoverState = useCallback((newState: Partial<HoverState>) => {
    setHoverStateInternal(prevState => ({ ...prevState, ...newState }));
  }, []);

  // Avoid re-creating the context value object on every render
  const contextValue = useMemo(
    () => ({
      dominantColors,
      setDominantColors: setDominantColorsState,
      hoverState,
      setHoverState, // Provide the stable setter
    }),
    [dominantColors, hoverState, setHoverState] // Add dependencies
  );

  return <ColorContext.Provider value={contextValue}>{children}</ColorContext.Provider>;
};
