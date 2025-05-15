import { useState, useEffect, useCallback } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

interface UseWindowResizeOptions {
  debounceDelay?: number;
  initialSize?: WindowSize;
}

function useWindowResize(options: UseWindowResizeOptions = {}): WindowSize {
  const {
    debounceDelay = 250,
    initialSize = {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    },
  } = options;

  const [windowSize, setWindowSize] = useState<WindowSize>(initialSize);

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedHandleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, debounceDelay);
    };

    window.addEventListener('resize', debouncedHandleResize);

    // Initial call
    handleResize();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, [debounceDelay, handleResize]);

  return windowSize;
}

export default useWindowResize; 