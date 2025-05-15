import { useEffect, useRef, useState, useCallback } from 'react';

interface ResizeObserverEntry {
  contentRect: DOMRectReadOnly;
  borderBoxSize: ReadonlyArray<ResizeObserverSize>;
  contentBoxSize: ReadonlyArray<ResizeObserverSize>;
  devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>;
  target: Element;
}

interface UseResizeObserverOptions {
  enabled?: boolean;
  onResize?: (entry: ResizeObserverEntry) => void;
  box?: 'border-box' | 'content-box' | 'device-pixel-content-box';
}

interface UseResizeObserverResult {
  ref: React.RefObject<HTMLElement>;
  width: number;
  height: number;
  entry: ResizeObserverEntry | null;
}

function useResizeObserver(
  options: UseResizeObserverOptions = {}
): UseResizeObserverResult {
  const { enabled = true, onResize, box = 'content-box' } = options;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [entry, setEntry] = useState<ResizeObserverEntry | null>(null);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const handleResize = useCallback(
    (entries: ResizeObserverEntry[]) => {
      const [entry] = entries;

      if (!entry) return;

      let newWidth = 0;
      let newHeight = 0;

      if (box === 'border-box') {
        newWidth = entry.borderBoxSize[0].inlineSize;
        newHeight = entry.borderBoxSize[0].blockSize;
      } else if (box === 'content-box') {
        newWidth = entry.contentBoxSize[0].inlineSize;
        newHeight = entry.contentBoxSize[0].blockSize;
      } else if (box === 'device-pixel-content-box') {
        newWidth = entry.devicePixelContentBoxSize[0].inlineSize;
        newHeight = entry.devicePixelContentBoxSize[0].blockSize;
      }

      setSize({ width: newWidth, height: newHeight });
      setEntry(entry);
      onResize?.(entry);
    },
    [box, onResize]
  );

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const observer = new ResizeObserver(handleResize);
    observerRef.current = observer;

    observer.observe(elementRef.current, { box });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, box, handleResize]);

  return {
    ref: elementRef,
    width: size.width,
    height: size.height,
    entry,
  };
}

export default useResizeObserver; 