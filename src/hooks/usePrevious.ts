import { useEffect, useRef } from 'react';

// Custom hook to get the previous value of a prop or state
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  // Store current value in ref *after* render
  useEffect(() => {
    ref.current = value;
  }, [value]); // Re-run effect if value changes

  // Return previous value (happens before update in useEffect)
  return ref.current;
}

export default usePrevious;
