import { useState, useEffect, useCallback } from 'react';

interface ScrollPosition {
  x: number;
  y: number;
}

interface UseScrollPositionOptions {
  element?: React.RefObject<HTMLElement>;
  debounceDelay?: number;
  throttleDelay?: number;
  onScroll?: (position: ScrollPosition) => void;
}

function useScrollPosition(options: UseScrollPositionOptions = {}): ScrollPosition {
  const {
    element,
    debounceDelay = 0,
    throttleDelay = 0,
    onScroll,
  } = options;

  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({
    x: 0,
    y: 0,
  });

  const getScrollPosition = useCallback((): ScrollPosition => {
    if (element?.current) {
      return {
        x: element.current.scrollLeft,
        y: element.current.scrollTop,
      };
    }

    return {
      x: window.pageXOffset,
      y: window.pageYOffset,
    };
  }, [element]);

  const handleScroll = useCallback(() => {
    const position = getScrollPosition();
    setScrollPosition(position);
    onScroll?.(position);
  }, [getScrollPosition, onScroll]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let lastRun = 0;

    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, debounceDelay);
    };

    const throttledHandleScroll = () => {
      const now = Date.now();

      if (now - lastRun >= throttleDelay) {
        handleScroll();
        lastRun = now;
      }
    };

    const scrollHandler = debounceDelay > 0
      ? debouncedHandleScroll
      : throttleDelay > 0
      ? throttledHandleScroll
      : handleScroll;

    const target = element?.current || window;
    target.addEventListener('scroll', scrollHandler, { passive: true });

    // Initial call
    handleScroll();

    return () => {
      clearTimeout(timeoutId);
      target.removeEventListener('scroll', scrollHandler);
    };
  }, [element, debounceDelay, throttleDelay, handleScroll]);

  return scrollPosition;
}

export default useScrollPosition; 