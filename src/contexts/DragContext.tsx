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
import { ImageInfo } from '../types'; // Assuming ImageInfo type path
import { Rect } from '../utils/intersectionUtils';

// Define the structure for potential drop targets
export interface PotentialDropTarget {
  targetId: string;
  position: 'before' | 'after'; // This will now represent horizontal position
  rowIndex: number; // Keep the row index
}

// Define the shape of the context
interface DragContextProps {
  activeId: UniqueIdentifier | null;
  potentialDropTarget: PotentialDropTarget | null;
  orderedImages: ImageInfo[];
  setCustomImageOrder: (order: string[] | null) => void;
  rows: { id: number; images: ImageInfo[] }[]; // Pass row structure
}

// Create the context
export const DragContext = createContext<DragContextProps | undefined>(undefined);

interface DragProviderProps {
  children: React.ReactNode;
  initialImages: ImageInfo[]; // Pass initial images
  currentOrder: string[] | null; // Pass current custom order
  onOrderChange: (newOrder: string[] | null) => void; // Callback when order changes
  getRowRects: () => Map<number, Rect>;
  rows: { id: number; images: ImageInfo[] }[];
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
  const [potentialDropTarget, setPotentialDropTarget] = useState<PotentialDropTarget | null>(null);

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

      // Add any images not in the saved order (e.g., newly added files)
      remainingImages.forEach(id => {
        const img = imageMap.get(id);
        if (img) {
          result.push(img);
        }
      });
      return result;
    }
    return initialImages; // Default to initial order if no custom order exists
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    console.log('[DragContext] Drag started:', event.active.id);
    setActiveId(event.active.id);
    setPotentialDropTarget(null); // Clear potential target on new drag
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;

      // Exit if not over anything or dragging over self
      if (!over || active.id === over.id) {
        if (potentialDropTarget) setPotentialDropTarget(null);
        return;
      }

      const activeRect = active.rect.current.translated;
      const overRect = over.rect;

      // Exit if rects aren't available
      if (!activeRect || !overRect) {
        if (potentialDropTarget) setPotentialDropTarget(null);
        return;
      }

      const overItemId = over.id.toString();
      const overItemRowIndex = imageIdToRowIndexMap.get(overItemId);

      // Exit if we can't determine the row of the item being hovered over
      if (overItemRowIndex === undefined) {
        if (potentialDropTarget) setPotentialDropTarget(null);
        return;
      }

      // --- Calculate HORIZONTAL position relative to the hovered item ---
      const targetId = overItemId;
      const targetRowIndex = overItemRowIndex; // Row index of the item hovered over

      // Calculate horizontal center of the dragged item
      const dragCenterX = activeRect.left + activeRect.width / 2;
      // Calculate horizontal center of the item being hovered over
      const targetMiddleX = overRect.left + overRect.width / 2;

      // Determine if pointer is before or after the horizontal midpoint
      const horizontalPosition = dragCenterX < targetMiddleX ? 'before' : 'after';
      // --- End of horizontal calculation ---

      // Construct the new potential target object
      const newTarget: PotentialDropTarget = {
        targetId: targetId,
        position: horizontalPosition, // Use the calculated horizontal position
        rowIndex: targetRowIndex,
      };

      // Update state only if the target has actually changed
      if (
        !potentialDropTarget ||
        potentialDropTarget.targetId !== newTarget.targetId ||
        potentialDropTarget.position !== newTarget.position ||
        potentialDropTarget.rowIndex !== newTarget.rowIndex
      ) {
        console.log('[DragContext] Setting potential drop target:', newTarget);
        setPotentialDropTarget(newTarget);
      }
    },
    [potentialDropTarget, imageIdToRowIndexMap] // Removed getRowRects as it's not used for horizontal check
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      // Store target info before clearing state
      const finalTargetInfo = potentialDropTarget;

      setActiveId(null);
      setPotentialDropTarget(null);

      if (over && active.id !== over.id) {
        const oldIndex = orderedImages.findIndex(img => img.id === active.id);
        // Determine the target index based on the item hovered over (over.id)
        // and the final drop position ('before' or 'after')
        let newIndex = orderedImages.findIndex(img => img.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          // Adjust newIndex based on the final drop indicator position if needed
          // This might already be handled correctly by arrayMove if it uses the visual target,
          // but explicit adjustment could be safer depending on arrayMove's exact behavior.
          // Example (if dropping 'after' the target item):
          // if (finalTargetInfo?.position === 'after') {
          //   newIndex = newIndex + 1; // Adjust index if necessary
          // }
          // Note: arrayMove might implicitly handle this based on visual order vs data order.
          // Let's rely on arrayMove for now and adjust if testing shows issues.

          console.log(
            `[DragContext] Reordering ${active.id} relative to ${over.id}. OldIdx: ${oldIndex}, NewIdx: ${newIndex}. Final Drop Pos: ${finalTargetInfo?.position}`
          );

          const newOrderedIds = arrayMove(orderedImages, oldIndex, newIndex).map(img => img.id);
          onOrderChange(newOrderedIds); // Update the order via callback
        } else {
          console.warn('[DragContext] Drag end: Active or Over index not found.');
        }
      } else {
        console.log('[DragContext] Drag canceled or no movement.');
      }
    },
    [orderedImages, onOrderChange, potentialDropTarget] // Dependencies for handleDragEnd
  );

  // Provide context values (including rows)
  const contextValue: DragContextProps = useMemo(
    () => ({
      activeId,
      potentialDropTarget, // Pass the updated potentialDropTarget state
      orderedImages,
      setCustomImageOrder: onOrderChange, // Keep using the callback prop
      rows,
    }),
    [activeId, potentialDropTarget, orderedImages, onOrderChange, rows]
  );

  // Prepare item IDs for SortableContext
  const itemIds = useMemo(() => orderedImages.map(img => img.id), [orderedImages]);

  return (
    <DragContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter} // Keep using closestCenter for finding the 'over' item
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </DragContext.Provider>
  );
};

// Custom hook to use the context
export const useDragContext = () => {
  const context = useContext(DragContext);
  if (context === undefined) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return context;
};
