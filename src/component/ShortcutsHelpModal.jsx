export default function ShortcutsHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const SHORTCUT_GROUPS = [
    {
      group: "Navigation & Creation",
      shortcuts: [
        { keys: ["C"], desc: "Quick capture new task (NL Parser)" },
        { keys: ["⌘", "K"], desc: "Global command search & jump to" },
        { keys: ["F"], desc: "Toggle Zen Focus Deck (Full-screen)" },
        { keys: ["?"], desc: "Show keyboard shortcuts cheatsheet" },
        { keys: ["Esc"], desc: "Close modal / drawer / dismiss" },
      ],
    },
    {
      group: "Flow Timer & Session",
      shortcuts: [
        { keys: ["Space"], desc: "Start / Pause global focus timer" },
        { keys: ["Enter"], desc: "Complete task & advance in Zen mode" },
      ],
    },
    {
      group: "Task Triage & Priorities",
      shortcuts: [
        { keys: ["X"], desc: "Toggle completion of active task" },
        { keys: ["1"], desc: "Set priority to P1 Urgent & High Impact" },
        { keys: ["2"], desc: "Set priority to P2 Strategic" },
        { keys: ["3"], desc: "Set priority to P3 Maintenance" },
      ],
    },
    {
      group: "Natural Language Parser Syntax",
      shortcuts: [
        { keys: ["#tag"], desc: "Categorize (e.g. #Frontend, #Security)" },
        { keys: ["45m", "1h"], desc: "Set estimated block duration" },
        { keys: ["P1", "P2"], desc: "Set priority level in prompt" },
        { keys: ["tomorrow"], desc: "Set due date automatically" },
      ],
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">keyboard</span>
            <h3 className="text-headline-sm font-bold text-on-surface">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((grp) => (
            <div key={grp.group} className="space-y-2">
              <h4 className="text-[11px] font-bold text-outline uppercase tracking-wider">
                {grp.group}
              </h4>
              <div className="space-y-1.5">
                {grp.shortcuts.map((sc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low/70 text-body-sm"
                  >
                    <span className="text-on-surface text-xs font-medium">{sc.desc}</span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface font-tabular-mono font-semibold text-xs border border-outline-variant/20 shadow-2xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-surface-container-high/60 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-outline">
          <span>Press any key when not typing in text fields</span>
          <button
            type="button"
            onClick={onClose}
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
