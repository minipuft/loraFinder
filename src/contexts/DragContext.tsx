import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager';
import { ImageInfo } from '../types/index.js';
import { Rect, findBestIntersectingRow } from '../utils/intersectionUtils';

// Define the structure for potential drop targets (item-specific)
export interface ItemDropTarget {
  targetId: string;
  position: 'before' | 'after';
}

export interface RowInfo {
  id: number | string; // Allow string IDs if needed
  images: ImageInfo[];
}

// Define the shape of the context
export interface DragContextProps {
  activeId: UniqueIdentifier | null;
  itemDropTarget: ItemDropTarget | null;
  hoveredRowIndex: number | null;
  orderedImages: ImageInfo[];
  setCustomImageOrder: (orderedIds: string[]) => void;
  rows: RowInfo[];
}

// Create the context
const DragContext = createContext<DragContextProps | undefined>(undefined);

interface DragProviderProps {
  children: React.ReactNode;
  initialImages: ImageInfo[];
  currentOrder: string[] | null;
  onOrderChange: (orderedIds: string[]) => void;
  getRowRects: () => Map<number, Rect>;
  rows: RowInfo[];
}

// Provider component
export const DragProvider: React.FC<DragProviderProps> = ({
  children,
  initialImages,
  currentOrder,
  onOrderChange,
  getRowRects,
  rows,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [itemDropTarget, setItemDropTarget] = useState<ItemDropTarget | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const globalPipeline = useAnimationPipeline('global');

  // Use memoized ordered images based on currentOrder or initialImages
  const orderedImages = useMemo(() => {
    if (currentOrder) {
      const imageMap = new Map(initialImages.map(img => [img.id, img]));
      const result: ImageInfo[] = [];
      const remainingImages = new Set(initialImages.map(img => img.id));

      currentOrder.forEach(id => {
        const img = imageMap.get(id);
        if (img) {
          result.push(img);
          remainingImages.delete(id);
        }
      });

      remainingImages.forEach(id => {
        const img = imageMap.get(id);
        if (img) {
          result.push(img);
        }
      });
      return result;
    } else {
      // Fallback if currentOrder is null (e.g., initial load or reset)
      return initialImages;
    }
  }, [initialImages, currentOrder]);

  // Map image IDs to their row index for quick lookup
  const imageIdToRowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      row.images.forEach(img => {
        map.set(img.id, index);
      });
    });
    return map;
  }, [rows]);

  // Improved sensor configuration with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
    // Add KeyboardSensor later for accessibility
  );

  // --- DndContext Handlers ---

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      console.log('[DragContext] Drag started:', event.active.id);
      setActiveId(event.active.id);
      setItemDropTarget(null);

      // Trigger global animation on drag start
      globalPipeline.addStep({ target: 'body', preset: 'dragStartGlow' }).play(); // Example preset
    },
    [globalPipeline] // Add pipeline dependency
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      let currentHoveredRowIndex: number | null = null;
      const activeRect = active?.rect?.current?.translated;

      if (activeRect) {
        const rowRects = getRowRects();
        const rowRectsForUtil = new Map<string | number, Rect>(Array.from(rowRects.entries()));
        const bestRowId = findBestIntersectingRow(activeRect, rowRectsForUtil, 0.1);

        if (bestRowId !== null && typeof bestRowId === 'number') {
          currentHoveredRowIndex = bestRowId;
        }
      }

      if (hoveredRowIndex !== currentHoveredRowIndex) {
        console.log('[DragContext] Hovered Row Index:', currentHoveredRowIndex);
        setHoveredRowIndex(currentHoveredRowIndex);
      }

      let currentItemTarget: ItemDropTarget | null = null;
      if (!over || !active || active.id === over.id) {
        if (itemDropTarget) setItemDropTarget(null);
        return;
      }

      const overRect = over.rect;
      if (!activeRect || !overRect) {
        if (itemDropTarget) setItemDropTarget(null);
        return;
      }

      const overItemId = over.id.toString();
      const targetId = overItemId;
      const dragCenterX = activeRect.left + activeRect.width / 2;
      const targetMiddleX = overRect.left + overRect.width / 2;
      const horizontalPosition = dragCenterX < targetMiddleX ? 'before' : 'after';

      currentItemTarget = {
        targetId: targetId,
        position: horizontalPosition,
      };

      if (
        !itemDropTarget ||
        itemDropTarget.targetId !== currentItemTarget.targetId ||
        itemDropTarget.position !== currentItemTarget.position
      ) {
        console.log('[DragContext] Setting Item Drop Target:', currentItemTarget);
        setItemDropTarget(currentItemTarget);
      }
    },
    [itemDropTarget, hoveredRowIndex, getRowRects] // Keep getRowRects dependency
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const finalItemTargetInfo = itemDropTarget;

      setActiveId(null);
      setItemDropTarget(null);
      setHoveredRowIndex(null);

      // Trigger global animation on drag end
      globalPipeline.addStep({ target: 'body', preset: 'dragEndFade' }).play(); // Example preset

      if (over && active.id !== over.id) {
        const oldIndex = orderedImages.findIndex(img => img.id === active.id);
        let newIndex = orderedImages.findIndex(img => img.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Simplified index calculation for arrayMove
          if (finalItemTargetInfo?.position === 'after') {
            // If dropping 'after' the target, the effective index for insertion is targetIndex + 1
            // arrayMove might need adjustment based on whether moving forward or backward.
            // Let's try the direct target index + 1 for 'after'
            newIndex += 1;
          }

          // Ensure the target index is valid for arrayMove
          const moveToIndex = Math.min(newIndex, orderedImages.length);

          console.log(
            `[DragContext] Reordering ${active.id}. OldIdx: ${oldIndex}, NewIdxTarget: ${moveToIndex}. DropPos: ${finalItemTargetInfo?.position}`
          );

          if (oldIndex !== moveToIndex) {
            // Only move if index actually changes
            const newOrderedIds = arrayMove(orderedImages, oldIndex, moveToIndex).map(
              img => img.id
            );
            onOrderChange(newOrderedIds);
          } else {
            console.log('[DragContext] No index change needed.');
          }
        } else {
          console.warn('[DragContext] Drag end: Active or Over index not found.');
        }
      } else {
        console.log('[DragContext] Drag canceled or no movement.');
      }
    },
    [orderedImages, onOrderChange, itemDropTarget, globalPipeline] // Add pipeline dependency
  );

  // Provide context values (including rows)
  const contextValue: DragContextProps = useMemo(
    () => ({
      activeId,
      itemDropTarget,
      hoveredRowIndex,
      orderedImages,
      setCustomImageOrder: onOrderChange,
      rows,
    }),
    [activeId, itemDropTarget, hoveredRowIndex, orderedImages, onOrderChange, rows]
  );

  // Prepare item IDs for SortableContext
  const itemIds = useMemo(() => orderedImages.map(img => img.id), [orderedImages]);

  return (
    <DragContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        // onDragCancel={handleDragCancel} // Consider adding drag cancel handling
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </DragContext.Provider>
  );
};

// Custom hook to use the context
export const useDragContext = (): DragContextProps => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};
