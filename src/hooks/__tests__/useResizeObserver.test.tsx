import { renderHook, act } from '@testing-library/react';
import useResizeObserver from '../useResizeObserver';

// Mock ResizeObserver
class ResizeObserverMock {
  callback: (entries: any[]) => void;

  constructor(callback: (entries: any[]) => void) {
    this.callback = callback;
  }

  observe() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }

  // Helper to trigger resize
  mockResize(width: number, height: number) {
    this.callback([
      {
        contentRect: {
          width,
          height,
          x: 0,
          y: 0,
          top: 0,
          right: width,
          bottom: height,
          left: 0,
        },
        target: document.createElement('div'),
      },
    ]);
  }
}

// Setup global mock
global.ResizeObserver = ResizeObserverMock as any;

describe('useResizeObserver', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default size', () => {
    const { result } = renderHook(() => useResizeObserver());
    expect(result.current.size).toEqual({ width: 0, height: 0 });
  });

  it('should update size after resize', () => {
    const { result } = renderHook(() => useResizeObserver());

    // Get the ResizeObserver instance
    const observer = (global.ResizeObserver as any).mock.instances[0];

    act(() => {
      observer.mockResize(100, 200);
      jest.runAllTimers(); // Run debounce timer
    });

    expect(result.current.size).toEqual({ width: 100, height: 200 });
  });

  it('should debounce resize updates', () => {
    const { result } = renderHook(() => useResizeObserver());
    const observer = (global.ResizeObserver as any).mock.instances[0];

    act(() => {
      observer.mockResize(100, 100);
      observer.mockResize(200, 200);
      observer.mockResize(300, 300);
      jest.advanceTimersByTime(100); // Not enough time for debounce
    });

    // Size should not have updated yet
    expect(result.current.size).toEqual({ width: 0, height: 0 });

    act(() => {
      jest.runAllTimers(); // Complete the debounce
    });

    // Should have the last size
    expect(result.current.size).toEqual({ width: 300, height: 300 });
  });

  it('should cleanup observer on unmount', () => {
    const disconnect = jest.fn();
    (global.ResizeObserver as any).mockImplementation(() => ({
      observe: jest.fn(),
      disconnect,
    }));

    const { unmount } = renderHook(() => useResizeObserver());
    unmount();

    expect(disconnect).toHaveBeenCalled();
  });

  it('should not update if size has not changed', () => {
    const { result } = renderHook(() => useResizeObserver());
    const observer = (global.ResizeObserver as any).mock.instances[0];

    act(() => {
      observer.mockResize(100, 100);
      jest.runAllTimers();
    });

    const initialRender = result.current;

    act(() => {
      observer.mockResize(100, 100); // Same size
      jest.runAllTimers();
    });

    // Should be the same object reference
    expect(result.current).toBe(initialRender);
  });
});
