import { renderHook, act } from '@testing-library/react';
import useWindowSize from '../useWindowSize';

describe('useWindowSize', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  it('should initialize with current window dimensions', () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toEqual({
      width: 1024,
      height: 768,
    });
  });

  it('should update dimensions after window resize', () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      // Update window dimensions
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 1080,
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      // Fast-forward debounce timer
      jest.runAllTimers();
    });

    expect(result.current).toEqual({
      width: 1920,
      height: 1080,
    });
  });

  it('should debounce resize updates', () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      // Multiple rapid resizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 800,
      });
      window.dispatchEvent(new Event('resize'));

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1000,
      });
      window.dispatchEvent(new Event('resize'));

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      window.dispatchEvent(new Event('resize'));

      // Advance time, but not enough for debounce
      jest.advanceTimersByTime(100);
    });

    // Should not have updated yet
    expect(result.current.width).toBe(1024);

    act(() => {
      // Complete the debounce
      jest.runAllTimers();
    });

    // Should have the final width
    expect(result.current.width).toBe(1200);
  });

  it('should cleanup resize listener on unmount', () => {
    const removeEventListener = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useWindowSize());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should not update if dimensions have not changed', () => {
    const { result } = renderHook(() => useWindowSize());
    const initialValue = result.current;

    act(() => {
      // Trigger resize but keep same dimensions
      window.dispatchEvent(new Event('resize'));
      jest.runAllTimers();
    });

    // Should be the same object reference
    expect(result.current).toBe(initialValue);
  });
});
