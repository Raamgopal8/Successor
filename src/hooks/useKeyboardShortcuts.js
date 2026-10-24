import { useEffect } from "react";

/**
 * Custom hook to handle power-user keyboard shortcuts:
 * - C: Quick capture new task (NL parser)
 * - F: Toggle Zen Focus Deck
 * - Space: Toggle focus timer
 * - X: Toggle completion of active/selected task
 * - 1, 2, 3: Set priority P1, P2, P3 on active/selected task
 * - ?: Show shortcuts cheatsheet
 */
export function useKeyboardShortcuts({
  onQuickCapture,
  onToggleZen,
  onToggleTimer,
  onToggleActiveTask,
  onSetPriority,
  onShowShortcuts,
  disabled = false,
}) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) return;

      // Ignore if meta/ctrl/alt are pressed (except for standard ? or Shift+/)
      const isMod = e.metaKey || e.ctrlKey || e.altKey;

      // 1. Quick Capture: 'C' or 'c'
      if ((e.key === "c" || e.key === "C") && !isMod) {
        e.preventDefault();
        onQuickCapture?.();
        return;
      }

      // 2. Toggle Zen Focus Deck: 'F' or 'f'
      if ((e.key === "f" || e.key === "F") && !isMod) {
        e.preventDefault();
        onToggleZen?.();
        return;
      }

      // 3. Toggle Global Timer: Space
      if (e.code === "Space" && !isMod) {
        e.preventDefault();
        onToggleTimer?.();
        return;
      }

      // 4. Toggle Active Task Completion: 'X' or 'x'
      if ((e.key === "x" || e.key === "X") && !isMod) {
        e.preventDefault();
        onToggleActiveTask?.();
        return;
      }

      // 5. Set Priority: '1', '2', '3'
      if (!isMod && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const pMap = {
          "1": "P1 Urgent & High Impact",
          "2": "P2 Strategic",
          "3": "P3 Maintenance",
        };
        onSetPriority?.(pMap[e.key]);
        return;
      }

      // 6. Show Shortcuts Help: '?' or Shift+'/'
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onQuickCapture,
    onToggleZen,
    onToggleTimer,
    onToggleActiveTask,
    onSetPriority,
    onShowShortcuts,
    disabled,
  ]);
}
