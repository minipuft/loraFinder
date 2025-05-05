import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { ViewMode } from '../types'; // Assuming ViewMode enum is exported from types
import { getHomeDirectory } from '../utils/settings'; // Assuming this utility exists

// Define the shape of the context value
export interface AppSettingsContextValue {
  selectedFolder: string;
  zoom: number;
  isGrouped: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  handleFolderChange: (folder: string) => void;
  handleZoomChange: (newZoom: number) => void;
  handleSearch: (query: string) => void;
  toggleIsGrouped: () => void;
  handleViewModeChange: (newMode: ViewMode) => void;
}

// Create the context with null default (ensures check in hook)
const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

// Create the Provider component
interface AppSettingsProviderProps {
  children: ReactNode;
}

export const AppSettingsProvider: React.FC<AppSettingsProviderProps> = ({ children }) => {
  // --- State Management ---
  const [selectedFolder, setSelectedFolder] = useState<string>(() => {
    // Safely get initial directory
    try {
      return getHomeDirectory() || '';
    } catch (error) {
      console.error('Failed to get home directory:', error);
      return ''; // Fallback if settings access fails
    }
  });
  const [zoom, setZoom] = useState<number>(1);
  const [isGrouped, setIsGrouped] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.GRID); // Default to GRID
  const [searchQuery, setSearchQuery] = useState<string>('');

  // --- Memoized Handlers ---
  const handleFolderChange = useCallback((folder: string) => {
    setSelectedFolder(folder);
    setSearchQuery(''); // Clear search on folder change
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    // Add potential clamping or validation if needed
    setZoom(newZoom);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const toggleIsGrouped = useCallback(() => {
    setIsGrouped(prev => !prev);
  }, []);

  const handleViewModeChange = useCallback((newMode: ViewMode) => {
    setViewMode(newMode);
  }, []);

  // --- Memoize the context value ---
  // This prevents consumers from re-rendering unnecessarily if the provider re-renders
  // but the values they depend on haven't actually changed.
  const contextValue = useMemo<AppSettingsContextValue>(
    () => ({
      selectedFolder,
      zoom,
      isGrouped,
      viewMode,
      searchQuery,
      handleFolderChange,
      handleZoomChange,
      handleSearch,
      toggleIsGrouped,
      handleViewModeChange,
    }),
    [
      selectedFolder,
      zoom,
      isGrouped,
      viewMode,
      searchQuery,
      handleFolderChange,
      handleZoomChange,
      handleSearch,
      toggleIsGrouped,
      handleViewModeChange,
    ]
  );

  // --- Render Provider ---
  return <AppSettingsContext.Provider value={contextValue}>{children}</AppSettingsContext.Provider>;
};

// --- Custom Hook for Consumption ---
export const useAppSettings = (): AppSettingsContextValue => {
  const context = useContext(AppSettingsContext);
  if (context === null) {
    // Provides a clear error message if used outside the provider
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
};
