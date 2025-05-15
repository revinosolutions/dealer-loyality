import { useEffect, useRef, useCallback } from 'react';

interface UseMutationObserverOptions extends MutationObserverInit {
  enabled?: boolean;
  onMutate?: (mutations: MutationRecord[], observer: MutationObserver) => void;
}

function useMutationObserver(
  targetRef: React.RefObject<HTMLElement>,
  options: UseMutationObserverOptions = {}
): void {
  const {
    enabled = true,
    onMutate,
    attributes = true,
    attributeFilter,
    attributeOldValue = true,
    characterData = true,
    characterDataOldValue = true,
    childList = true,
    subtree = true,
  } = options;

  const observerRef = useRef<MutationObserver | null>(null);

  const handleMutations = useCallback(
    (mutations: MutationRecord[], observer: MutationObserver) => {
      onMutate?.(mutations, observer);
    },
    [onMutate]
  );

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const observer = new MutationObserver(handleMutations);
    observerRef.current = observer;

    observer.observe(targetRef.current, {
      attributes,
      attributeFilter,
      attributeOldValue,
      characterData,
      characterDataOldValue,
      childList,
      subtree,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    enabled,
    targetRef,
    handleMutations,
    attributes,
    attributeFilter,
    attributeOldValue,
    characterData,
    characterDataOldValue,
    childList,
    subtree,
  ]);
}

export default useMutationObserver; 