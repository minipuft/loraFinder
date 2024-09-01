declare module 'react-visual-grid' {
  import { FC, ReactNode } from 'react';

  interface VisualGridProps {
    items: any[];
    itemComponent: FC<any>;
    itemProps?: any;
    gridGap?: number;
    minColumnWidth?: number;
    maxColumnWidth?: number;
  }

  export const VisualGrid: FC<VisualGridProps>;
}