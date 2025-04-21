import { IntersectionOptions, useInView } from 'react-intersection-observer';

/**
 * Wraps react-intersection-observer's useInView hook.
 * Returns [ref, inView, entry], supporting configuration options
 */
export function useIntersectionObserver(
  options: IntersectionOptions = {}
): ReturnType<typeof useInView> {
  return useInView(options);
}
