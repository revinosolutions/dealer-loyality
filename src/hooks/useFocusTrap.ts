import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  enabled?: boolean;
  returnFocusOnDeactivate?: boolean;
  escapeDeactivates?: boolean;
  onDeactivate?: () => void;
}

function useFocusTrap(options: UseFocusTrapOptions = {}): React.RefObject<HTMLElement> {
  const {
    enabled = true,
    returnFocusOnDeactivate = true,
    escapeDeactivates = true,
    onDeactivate,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  const handleFocus = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const isTabPressed = event.key === 'Tab';

      if (!isTabPressed) return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, getFocusableElements]
  );

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !escapeDeactivates) return;

      if (event.key === 'Escape') {
        onDeactivate?.();
      }
    },
    [enabled, escapeDeactivates, onDeactivate]
  );

  // Set up focus trap
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add event listeners
    document.addEventListener('keydown', handleFocus);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleFocus);
      document.removeEventListener('keydown', handleEscape);

      // Return focus to the previously focused element
      if (returnFocusOnDeactivate && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [
    enabled,
    getFocusableElements,
    handleFocus,
    handleEscape,
    returnFocusOnDeactivate,
  ]);

  return containerRef;
}

export default useFocusTrap; 