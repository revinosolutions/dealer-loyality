import { useEffect, useCallback } from 'react';

type KeyboardKey = string;
type KeyboardModifier = 'ctrl' | 'alt' | 'shift' | 'meta';
type KeyboardShortcut = {
  key: KeyboardKey;
  modifiers?: KeyboardModifier[];
};

interface UseKeyboardShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  targetKey?: string;
}

function useKeyboardShortcut(
  shortcut: KeyboardShortcut | KeyboardShortcut[],
  callback: (event: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions = {}
): void {
  const { preventDefault = true, stopPropagation = true, targetKey } = options;

  const isModifierPressed = useCallback(
    (event: KeyboardEvent, modifiers: KeyboardModifier[] = []): boolean => {
      const modifierMap = {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey,
      };

      return modifiers.every((modifier) => modifierMap[modifier]);
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // If a target key is specified, only trigger if the event target matches
      if (targetKey && !(event.target as HTMLElement)?.matches?.(targetKey)) {
        return;
      }

      const shortcuts = Array.isArray(shortcut) ? shortcut : [shortcut];

      for (const { key, modifiers = [] } of shortcuts) {
        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          isModifierPressed(event, modifiers)
        ) {
          if (preventDefault) {
            event.preventDefault();
          }
          if (stopPropagation) {
            event.stopPropagation();
          }
          callback(event);
          return;
        }
      }
    },
    [shortcut, callback, preventDefault, stopPropagation, targetKey, isModifierPressed]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcut; 