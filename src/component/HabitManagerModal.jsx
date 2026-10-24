import React, { useState } from "react";
import { useApp } from "../context/AppContext";

const CADENCE_OPTIONS = [
  { id: "daily", label: "Daily", icon: "calendar_today", desc: "Every single day" },
  { id: "weekdays", label: "Weekdays", icon: "work", desc: "Mon–Fri (Weekends protected)" },
  { id: "weekly", label: "Weekly", icon: "event_repeat", desc: "Once per week" },
  { id: "custom", label: "3x / Week", icon: "flag", desc: "Flexible 3 days a week" },
];

export default function HabitManagerModal({ isOpen, onClose }) {
  const { habits, createHabit, updateHabit, deleteHabit, refillHabitShield } = useApp();

  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState("15m");
  const [newCadence, setNewCadence] = useState("daily");
  const [editingHabitId, setEditingHabitId] = useState(null);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await createHabit({
      title: newTitle.trim(),
      duration: newDuration,
      cadence: newCadence,
      streakShields: 2,
    });

    setNewTitle("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/20 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">spa</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Recurring Rituals &amp; Habit Streaks Engine
              </h3>
              <p className="font-label-sm text-label-sm text-outline">
                Configure cadences, streak shields (grace days), and build unstoppable daily momentum.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Explainer: Streak Shields */}
          <div className="p-3.5 rounded-xl bg-secondary-container/20 border border-secondary/25 flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-[22px] mt-0.5">
              shield
            </span>
            <div className="text-body-sm">
              <span className="font-semibold text-on-surface">
                Streak Shields (Grace Days):
              </span>{" "}
              <span className="text-on-surface-variant">
                Missing a day due to travel or rest shouldn&apos;t demotivate you. When you miss a required day, 1 Streak Shield is automatically used to freeze and preserve your streak!
              </span>
            </div>
          </div>

          {/* Create New Habit Form */}
          <form onSubmit={handleCreate} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
            <span className="font-label-sm uppercase tracking-wider text-outline font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Add New Ritual
            </span>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="Ritual name (e.g. Read 20 mins, Core workout)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-body-sm outline-none border border-outline-variant/25 focus:border-secondary"
                required
              />
              <select
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface text-body-sm outline-none border border-outline-variant/25 cursor-pointer font-tabular-mono"
              >
                <option value="10m">10 min</option>
                <option value="15m">15 min</option>
                <option value="30m">30 min</option>
                <option value="45m">45 min</option>
                <option value="60m">60 min</option>
                <option value="90m">90 min</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md font-semibold hover:bg-secondary/90 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Add Ritual</span>
              </button>
            </div>

            {/* Cadence Pills for Creation */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              <span className="text-[11px] text-outline font-medium mr-1">Cadence:</span>
              {CADENCE_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewCadence(c.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-label-sm font-medium transition-all cursor-pointer ${
                    newCadence === c.id
                      ? "bg-secondary text-on-secondary shadow-xs font-semibold"
                      : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                  }`}
                  title={c.desc}
                >
                  <span className="material-symbols-outlined text-[13px]">{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </form>

          {/* Active Rituals List with Cadence & Shield Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-sm text-[16px] text-on-surface font-bold">
                Your Active Rituals ({habits.length})
              </h4>
              <span className="text-[12px] text-outline font-tabular-mono">
                {habits.filter((h) => h.done).length} completed today
              </span>
            </div>

            {habits.length === 0 ? (
              <div className="p-8 text-center text-outline bg-surface-container-low rounded-xl">
                <span className="material-symbols-outlined text-3xl mb-1">spa</span>
                <p className="font-body-sm font-medium">No rituals configured yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {habits.map((h) => {
                  const currentCadence = h.cadence || "daily";
                  const cadenceInfo = CADENCE_OPTIONS.find((c) => c.id === currentCadence) || CADENCE_OPTIONS[0];
                  const shields = h.streakShields ?? 2;

                  return (
                    <div
                      key={h.id}
                      className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            h.done ? "bg-secondary text-on-secondary" : "border-2 border-outline-variant text-transparent"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                        </span>

                        <div className="min-w-0">
                          <p className={`font-body-md text-body-md font-semibold truncate ${h.done ? "line-through text-outline" : "text-on-surface"}`}>
                            {h.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-tabular-mono text-outline">
                              {h.duration || "15m"}
                            </span>
                            <span className="text-outline">&bull;</span>
                            {/* Cadence Selector */}
                            <select
                              value={currentCadence}
                              onChange={(e) => updateHabit(h.id, { cadence: e.target.value })}
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-container-lowest text-on-surface border border-outline-variant/20 outline-none cursor-pointer"
                            >
                              {CADENCE_OPTIONS.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label} ({c.desc})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Right: Streak & Streak Shields */}
                      <div className="flex items-center gap-2.5 flex-shrink-0 self-end sm:self-center">
                        {/* Streak Badge */}
                        <div
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface border border-outline-variant/20 font-tabular-mono text-label-sm font-bold"
                          title={`Current streak: ${h.streak || 0} days (Best: ${h.bestStreak || h.streak || 0}d)`}
                        >
                          <span className="text-amber-500">🔥</span>
                          <span>{h.streak || 0}d</span>
                        </div>

                        {/* Streak Shields Badge & Refill */}
                        <button
                          type="button"
                          onClick={() => refillHabitShield(h.id)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-tabular-mono text-label-sm font-semibold transition-all cursor-pointer border ${
                            shields > 0
                              ? "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20"
                              : "bg-error/10 text-error border-error/30 hover:bg-error/20"
                          }`}
                          title="Click to add +1 Streak Shield (Grace day freeze)"
                        >
                          <span className="material-symbols-outlined text-[15px]">shield</span>
                          <span>{shields} {shields === 1 ? "Shield" : "Shields"}</span>
                          <span className="text-[11px] opacity-70 ml-0.5">+</span>
                        </button>

                        {/* Delete Habit */}
                        <button
                          type="button"
                          onClick={() => deleteHabit(h.id)}
                          className="p-1 text-outline hover:text-error hover:bg-surface-container-highest rounded-md transition-colors cursor-pointer"
                          title="Delete Ritual"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/15 flex items-center justify-between bg-surface-container/30">
          <span className="text-label-sm text-outline">
            All cadence rules &amp; streak shields sync live with Cloud Firestore.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md font-semibold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
