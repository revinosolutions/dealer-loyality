import { useEffect, useRef, useCallback } from 'react';

interface UseClickOutsideOptions {
  enabled?: boolean;
  excludeRefs?: React.RefObject<HTMLElement>[];
}

function useClickOutside(
  callback: (event: MouseEvent | TouchEvent) => void,
  options: UseClickOutsideOptions = {}
): React.RefObject<HTMLElement> {
  const { enabled = true, excludeRefs = [] } = options;
  const ref = useRef<HTMLElement>(null);

  const handleClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!enabled) return;

      const target = event.target as Node;
      const element = ref.current;

      // Check if the click was outside the main element
      const isOutside = element && !element.contains(target);

      // Check if the click was not inside any of the excluded elements
      const isNotExcluded = excludeRefs.every(
        (excludeRef) => !excludeRef.current?.contains(target)
      );

      if (isOutside && isNotExcluded) {
        callback(event);
      }
    },
    [callback, enabled, excludeRefs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [enabled, handleClick]);

  return ref;
}

export default useClickOutside; 