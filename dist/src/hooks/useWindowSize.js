import { useState, useEffect } from 'react';
// Custom hook to track and return the current window size
function useWindowSize() {
    // State to store the current window size
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });
    useEffect(() => {
        // Variables for debouncing and tracking size changes
        let timeoutId = null;
        let lastWidth = window.innerWidth;
        let lastHeight = window.innerHeight;
        // Function to handle window resize events
        function handleResize() {
            // Clear any existing timeout to debounce the resize event
            if (timeoutId)
                clearTimeout(timeoutId);
            // Set a new timeout to update the window size after a short delay
            timeoutId = setTimeout(() => {
                const newWidth = window.innerWidth;
                const newHeight = window.innerHeight;
                // Only update the state if the size has actually changed
                if (newWidth !== lastWidth || newHeight !== lastHeight) {
                    lastWidth = newWidth;
                    lastHeight = newHeight;
                    setWindowSize({ width: newWidth, height: newHeight });
                }
            }, 200); // 200ms delay for debouncing
        }
        // Add event listener for window resize
        window.addEventListener('resize', handleResize);
        // Call handleResize immediately to set initial size
        handleResize();
        // Cleanup function to remove event listener
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures that effect is only run on mount
    // Return the current window size
    return windowSize;
}
export default useWindowSize;
//# sourceMappingURL=useWindowSize.js.map