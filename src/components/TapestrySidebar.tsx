import { motion } from 'framer-motion';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { ColorContext, SidebarInteractionItemState } from '../contexts/ColorContext';
import { useFolders } from '../hooks/query/useFolders';
import styles from '../styles/TapestrySidebar.module.scss';

// Props for TapestrySidebar, including the auraCanvasRef
interface TapestrySidebarProps {
  auraCanvasRef: React.RefObject<HTMLCanvasElement>;
}

export const TapestrySidebar: React.FC<TapestrySidebarProps> = ({ auraCanvasRef }) => {
  const { data: folders, isLoading } = useFolders();
  const { selectedFolder, handleFolderChange } = useAppSettings();
  const { setSidebarHoverState, setSidebarSelectedState } = useContext(ColorContext);
  const folderItemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Adjust refs array size when folders data changes
  useEffect(() => {
    if (folders) {
      folderItemRefs.current = folderItemRefs.current.slice(0, folders.length);
    } else {
      folderItemRefs.current = [];
    }
  }, [folders]);

  // Helper function to calculate UV data for an item
  const calculateItemUVs = useCallback(
    (
      itemElement: HTMLLIElement,
      canvasElement: HTMLCanvasElement
    ): SidebarInteractionItemState | null => {
      const itemRect = itemElement.getBoundingClientRect();
      const canvasRect = canvasElement.getBoundingClientRect();

      if (canvasRect.width === 0 || canvasRect.height === 0) return null;

      const uvX = (itemRect.left + itemRect.width / 2 - canvasRect.left) / canvasRect.width;
      const uvY = (itemRect.top + itemRect.height / 2 - canvasRect.top) / canvasRect.height;
      const itemHeightUV = itemRect.height / canvasRect.height;

      // Basic bounds check (optional, but good for sanity)
      // if (uvX < 0 || uvX > 1 || uvY < 0 || uvY > 1) return null;

      return { isActive: true, uv: [uvX, uvY], itemHeightUV };
    },
    []
  );

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLLIElement>) => {
      if (!auraCanvasRef.current) return;
      const uvData = calculateItemUVs(event.currentTarget, auraCanvasRef.current);
      if (uvData) {
        setSidebarHoverState(uvData);
      } else {
        setSidebarHoverState({ isActive: false, uv: null, itemHeightUV: null });
      }
    },
    [auraCanvasRef, calculateItemUVs, setSidebarHoverState]
  );

  const handleMouseLeave = useCallback(() => {
    setSidebarHoverState({ isActive: false, uv: null, itemHeightUV: null });
  }, [setSidebarHoverState]);

  // Effect to update selected state UVs when selectedFolder or folders list changes
  useEffect(() => {
    if (!selectedFolder || !folders || !auraCanvasRef.current) {
      setSidebarSelectedState({ isActive: false, uv: null, itemHeightUV: null });
      return;
    }

    const selectedIndex = folders.findIndex(f => f.name === selectedFolder);
    if (selectedIndex === -1) {
      setSidebarSelectedState({ isActive: false, uv: null, itemHeightUV: null });
      return;
    }

    // RAF to wait for layout stabilization
    const animationFrameId = requestAnimationFrame(() => {
      const selectedElement = folderItemRefs.current[selectedIndex];
      const canvasEl = auraCanvasRef.current; // Capture current ref inside RAF

      if (selectedElement && canvasEl) {
        const uvData = calculateItemUVs(selectedElement, canvasEl);
        if (uvData) {
          setSidebarSelectedState(uvData);
        } else {
          setSidebarSelectedState({ isActive: false, uv: null, itemHeightUV: null });
        }
      } else {
        setSidebarSelectedState({ isActive: false, uv: null, itemHeightUV: null });
      }
    });

    return () => {
      cancelAnimationFrame(animationFrameId); // Cleanup RAF
    };
  }, [selectedFolder, folders, auraCanvasRef, setSidebarSelectedState, calculateItemUVs]);

  if (isLoading) return <div className={styles.sidebarLoading}>Loading...</div>;

  return (
    <nav className={styles.tapestrySidebar}>
      <ul>
        {(folders ?? []).map((folder, index) => (
          <motion.li
            ref={el => {
              folderItemRefs.current[index] = el;
            }}
            key={folder.name}
            className={`${styles.folderItem} ${selectedFolder === folder.name ? styles.selected : ''}`}
            onClick={() => handleFolderChange(folder.name)}
            whileHover={{ scale: 1.08, y: -2 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') handleFolderChange(folder.name);
            }}
          >
            {folder.name}
          </motion.li>
        ))}
      </ul>
    </nav>
  );
};
