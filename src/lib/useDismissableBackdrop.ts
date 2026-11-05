import { useCallback, useRef } from "react";

/** Close on backdrop click only when the pointer down also started on the backdrop (not text selection dragging out). */
export function useDismissableBackdrop(onDismiss: () => void) {
  const pointerStartedOnBackdrop = useRef(false);

  const onBackdropMouseDown = useCallback((e: React.MouseEvent) => {
    pointerStartedOnBackdrop.current = e.target === e.currentTarget;
  }, []);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && pointerStartedOnBackdrop.current) {
        onDismiss();
      }
      pointerStartedOnBackdrop.current = false;
    },
    [onDismiss],
  );

  const onPanelMouseDown = useCallback(() => {
    pointerStartedOnBackdrop.current = false;
  }, []);

  return { onBackdropMouseDown, onBackdropClick, onPanelMouseDown };
}
