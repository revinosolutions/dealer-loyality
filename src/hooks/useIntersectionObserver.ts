import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  enabled?: boolean;
  onIntersect?: (entry: IntersectionObserverEntry) => void;
  onEnter?: () => void;
  onLeave?: () => void;
  once?: boolean;
}

interface UseIntersectionObserverResult {
  ref: React.RefObject<HTMLElement>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    onIntersect,
    onEnter,
    onLeave,
    once = false,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredOnce = useRef(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      const isElementIntersecting = entry.isIntersecting;

      setIsIntersecting(isElementIntersecting);
      setEntry(entry);

      if (isElementIntersecting) {
        onEnter?.();
        if (once) {
          hasTriggeredOnce.current = true;
        }
      } else {
        onLeave?.();
      }

      onIntersect?.(entry);

      if (once && isElementIntersecting && observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }
    },
    [onIntersect, onEnter, onLeave, once]
  );

  useEffect(() => {
    if (!enabled || !elementRef.current || (once && hasTriggeredOnce.current)) return;

    const observer = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin,
      threshold,
    });

    observer.observe(elementRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, root, rootMargin, threshold, handleIntersect, once]);

  return {
    ref: elementRef,
    isIntersecting,
    entry,
  };
}

export default useIntersectionObserver; 