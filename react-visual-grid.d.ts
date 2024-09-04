// Declaration for the 'react-visual-grid' module
declare module 'react-visual-grid' {
  // Import necessary types from React
  import { FC, ReactNode } from 'react';

  // Define the props interface for the VisualGrid component
  interface VisualGridProps {
    // Array of items to be displayed in the grid
    items: any[];
    // Component to render each item
    itemComponent: FC<any>;
    // Optional additional props for each item
    itemProps?: any;
    // Optional gap between grid items
    gridGap?: number;
    // Optional minimum width for grid columns
    minColumnWidth?: number;
    // Optional maximum width for grid columns
    maxColumnWidth?: number;
  }

  // Export the VisualGrid component as a Functional Component with VisualGridProps
  export const VisualGrid: FC<VisualGridProps>;
}