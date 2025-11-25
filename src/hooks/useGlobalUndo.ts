import { useEffect } from 'react';
import { useUndoStore } from '../state/undoStore';

export function useGlobalUndo() {
  const { undo, redo } = useUndoStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if focus is on an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (event.shiftKey) {
          // Ctrl+Shift+Z -> Redo
          event.preventDefault();
          void redo();
        } else {
          // Ctrl+Z -> Undo
          event.preventDefault();
          void undo();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        // Ctrl+Y -> Redo
        event.preventDefault();
        void redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
