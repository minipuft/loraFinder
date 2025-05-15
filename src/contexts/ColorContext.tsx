import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

// --- Define Hover Data Structure (Exported) ---
export interface ImageHoverData {
  isHovering: boolean;
  position: { x: number; y: number } | null; // Used for e.g., targeted effects
  color: string | null; // Dominant color (will be base color)
  complementaryColor?: string | null; // ++ ADD complementary color for hover
  imageId: string | null; // ID of the hovered image
}
// --- End Hover Data Structure ---

// ++ Define new state structure for sidebar interactions ++
export interface SidebarInteractionItemState {
  isActive: boolean;
  uv: [number, number] | null; // Center [x, y] of the item in UV space
  itemHeightUV: number | null; // Height of the item in UV space
}

export interface EchoTriggerParams {
  center: [number, number]; // Viewport coordinates
  colorVec3: [number, number, number]; // Normalized RGB
}
export interface EchoTriggerState {
  params: EchoTriggerParams;
  id: string; // Unique ID for each trigger event
}

// Define the ImagePalette structure (copied/adapted from worker for now)
// In a larger setup, this might live in a shared types file.
export interface ImagePalette {
  base: string; // hex
  complementary: string; // hex
  // Future accents would go here
  // accent1?: string;
  // accent2?: string;
}

// Define the shape of the context data
interface ColorContextType {
  imagePalette: ImagePalette | null; // Changed from dominantColors: string[]
  setImagePalette: (palette: ImagePalette | null) => void; // Changed from setDominantColors
  hoverState: ImageHoverData; // Use the new structure
  setHoverState: (newState: ImageHoverData) => void; // Use the new structure
  echoTrigger: EchoTriggerState | null;
  triggerEcho: (params: EchoTriggerParams) => void;
  // ++ Sidebar Interaction States ++
  sidebarHoverState: SidebarInteractionItemState;
  setSidebarHoverState: (newState: SidebarInteractionItemState) => void;
  sidebarSelectedState: SidebarInteractionItemState;
  setSidebarSelectedState: (newState: SidebarInteractionItemState) => void;
}

// Default initial palette (can be null or a default palette)
const initialDefaultPalette: ImagePalette | null = null;
// Or, if a default is desired:
// const initialDefaultPalette: ImagePalette = {
//   base: '#041024', // Dark blueish
//   complementary: '#7AA2F7', // A lighter blue as complementary for the dark default
// };

// Initial hover state using the new structure
const initialHoverState: ImageHoverData = {
  isHovering: false,
  position: null,
  color: null,
  complementaryColor: null, // ++ ADD initial value
  imageId: null,
};

// ++ Initial states for sidebar interactions ++
const initialSidebarHoverState: SidebarInteractionItemState = {
  isActive: false,
  uv: null,
  itemHeightUV: null,
};
const initialSidebarSelectedState: SidebarInteractionItemState = {
  isActive: false,
  uv: null,
  itemHeightUV: null,
};

// Create the context with a default value
export const ColorContext = createContext<ColorContextType>({
  imagePalette: initialDefaultPalette, // Changed
  setImagePalette: () => {}, // Changed, No-op function as default
  hoverState: initialHoverState, // Add initial hover state
  setHoverState: () => {}, // Add no-op setter
  echoTrigger: null,
  triggerEcho: () => {},
  // ++ Provide defaults for sidebar states ++
  sidebarHoverState: initialSidebarHoverState,
  setSidebarHoverState: () => {},
  sidebarSelectedState: initialSidebarSelectedState,
  setSidebarSelectedState: () => {},
});

// Create the provider component
interface ColorProviderProps {
  children: ReactNode;
}

export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [currentImagePalette, setCurrentImagePalette] = useState<ImagePalette | null>(
    initialDefaultPalette
  ); // Changed
  const [hoverState, setHoverState] = useState<ImageHoverData>(initialHoverState); // Add hover state management
  const [echoTrigger, setEchoTrigger] = useState<EchoTriggerState | null>(null);
  // ++ Add useState for sidebar interaction states ++
  const [sidebarHoverState, setSidebarHoverState] =
    useState<SidebarInteractionItemState>(initialSidebarHoverState);
  const [sidebarSelectedState, setSidebarSelectedState] = useState<SidebarInteractionItemState>(
    initialSidebarSelectedState
  );

  // ++ Side effect to update CSS custom properties on the :root when palette changes ++
  useEffect(() => {
    const root = document.documentElement;
    if (currentImagePalette) {
      root.style.setProperty('--palette-base', currentImagePalette.base);
      root.style.setProperty('--palette-complementary', currentImagePalette.complementary);
      console.log(
        '[ColorContext] CSS vars set --base:',
        currentImagePalette.base,
        '--comp:',
        currentImagePalette.complementary
      );
    } else {
      // Set to neutral defaults or remove if a global default stylesheet is preferred
      root.style.setProperty('--palette-base', '#777777'); // Neutral grey
      root.style.setProperty('--palette-complementary', '#999999'); // Lighter neutral grey
      // Or remove them:
      // root.style.removeProperty('--palette-base');
      // root.style.removeProperty('--palette-complementary');
      console.log('[ColorContext] CSS vars set to default neutrals');
    }
    // Cleanup function (optional, if you want to remove them on unmount of provider, though generally not needed for :root vars)
    // return () => {
    //   root.style.removeProperty('--palette-base');
    //   root.style.removeProperty('--palette-complementary');
    // };
  }, [currentImagePalette]);
  // ++ End side effect ++

  const triggerEcho = useCallback((params: EchoTriggerParams) => {
    setEchoTrigger({ params, id: Date.now().toString() + Math.random().toString() });
  }, []);

  // Avoid re-creating the context value object on every render
  const contextValue = useMemo<ColorContextType>(
    () => ({
      imagePalette: currentImagePalette, // Changed
      setImagePalette: setCurrentImagePalette, // Changed
      hoverState, // Provide hover state
      setHoverState, // Provide hover state setter
      echoTrigger,
      triggerEcho,
      // ++ Provide actual states and setters for sidebar interactions ++
      sidebarHoverState,
      setSidebarHoverState,
      sidebarSelectedState,
      setSidebarSelectedState,
    }),
    [
      currentImagePalette, // Changed
      hoverState,
      setHoverState,
      echoTrigger,
      triggerEcho,
      sidebarHoverState,
      setSidebarHoverState,
      sidebarSelectedState,
      setSidebarSelectedState,
    ] // Add new states and setters to dependency array
  );

  return <ColorContext.Provider value={contextValue}>{children}</ColorContext.Provider>;
};
