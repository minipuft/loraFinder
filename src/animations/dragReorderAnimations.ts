import { Variants } from 'framer-motion';

/**
 * Framer Motion variants for draggable ImageItem components.
 * Defines visual states for initial appearance and while being dragged.
 */
export const dragItemVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
    zIndex: 1, // Default z-index
    // Smooth spring transition for returning to initial state
    transition: { type: 'spring', stiffness: 500, damping: 30 },
  },
  dragging: {
    scale: 1.05, // Slightly larger
    opacity: 0.9, // Slightly transparent
    boxShadow: '0px 10px 25px rgba(0,0,0,0.3)', // More prominent shadow
    zIndex: 10, // Ensure it's above other items
    cursor: 'grabbing',
    // Faster, direct transition into the dragging state
    transition: { duration: 0.1 },
  },
};
