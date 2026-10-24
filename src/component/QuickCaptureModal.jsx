import { useState, useEffect, useRef } from "react";
import { parseNaturalLanguageTask } from "../utils/taskParser";
import { useApp } from "../context/AppContext";

export default function QuickCaptureModal({ isOpen, onClose, onTaskCreated }) {
  const { createTask, taskLabels, getLabelStyle, showToast } = useApp();
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const parsed = parseNaturalLanguageTask(inputValue, taskLabels);

  const handleSubmit = async (e, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !parsed.cleanTitle.trim()) return;

    try {
      const created = await createTask({
        title: parsed.cleanTitle,
        description: `Quick-captured via natural language command. Due: ${parsed.dueDate}`,
        category: parsed.category,
        priority: parsed.priority,
        duration: parsed.duration,
        effort: parsed.effort,
        tags: parsed.tags,
        date: parsed.dueDate,
        status: parsed.status,
        completed: false,
      });

      if (onTaskCreated && created) {
        onTaskCreated(created);
      }

      if (keepOpen) {
        setInputValue("");
        inputRef.current?.focus();
        showToast("Task created! Keep typing...", "success");
      } else {
        onClose();
        showToast("Task created successfully", "success");
      }
    } catch (err) {
      console.error("Failed to quick-create task:", err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(null, e.shiftKey);
    }
  };

  const handleAppendToken = (token) => {
    setInputValue((prev) => `${prev.trim()} ${token} `.trimStart());
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const priorityStyle = getLabelStyle(parsed.priority);
  const categoryStyle = getLabelStyle(parsed.category);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden animate-in slide-in-from-top-2 duration-200"
      >
        {/* Top Header / Mode Banner */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-outline-variant/15 text-on-surface">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
            <span className="font-headline-sm text-sm font-bold tracking-tight">Quick Task &amp; NL Parser</span>
            
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-outline font-tabular-mono text-[11px]">
            Esc to close
          </kbd>
        </div>

        {/* Command Input Area */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-5 space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Design auth workflow tomorrow 45m #Security P1"
              className="w-full text-base sm:text-lg bg-transparent text-on-surface placeholder:text-outline/60 outline-none font-medium leading-relaxed"
              autoFocus
            />
          </div>

          {/* Real-time Parsed Preview Badges */}
          <div className="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/20 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-outline font-semibold uppercase tracking-wider">
              <span>Parsed Attributes</span>
              {inputValue.trim() && (
                <span className="text-secondary font-medium">Auto-detected from input</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Priority Chip */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-bold border ${priorityStyle.bg} ${priorityStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                <span>Priority: {parsed.priority}</span>
              </span>

              {/* Category / Tag Chip */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm text-[11px] font-semibold border ${categoryStyle.bg} ${categoryStyle.border}`}>
                <span>Tag: {parsed.category}</span>
              </span>

              {/* Duration Chip */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] font-semibold border border-outline-variant/20">
                <span className="material-symbols-outlined text-[13px] text-tertiary">schedule</span>
                <span>{parsed.duration}</span>
              </span>

              {/* Due Date Chip */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-[11px] font-semibold border border-outline-variant/20">
                <span className="material-symbols-outlined text-[13px] text-primary">event</span>
                <span>{parsed.dueDate}</span>
              </span>
            </div>

            {/* Clean Title Preview */}
            <div className="pt-1 text-xs text-on-surface-variant flex items-center gap-1.5">
              <span className="text-outline">Clean Title:</span>
              <strong className="text-on-surface truncate font-semibold">
                {parsed.cleanTitle || "Start typing above..."}
              </strong>
            </div>
          </div>

          {/* Quick-insert tokens shortcut bar */}
          <div className="space-y-1">
            <div className="text-[11px] text-outline font-medium">Quick suggestions (click to insert):</div>
            <div className="flex flex-wrap gap-1.5">
              {["P1", "P2", "P3", "30m", "45m", "90m", "Tomorrow", "#Frontend", "#Backend", "#DeepWork"].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => handleAppendToken(token)}
                  className="px-2 py-0.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 text-xs text-outline">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-tabular-mono text-[10px]">↵</kbd> create
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-tabular-mono text-[10px]">⇧↵</kbd> add more
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high text-label-md font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!parsed.cleanTitle.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container disabled:opacity-50 text-label-md font-semibold cursor-pointer transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
