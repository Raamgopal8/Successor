import { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../context/AppContext";

export default function ZenFocusDeck({ isOpen, onClose }) {
  const {
    tasks,
    timerSeconds,
    timerRunning,
    formattedTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerSeconds,
    toggleTaskCompletion,
    updateTask,
    getLabelStyle,
    activeSessionTaskId,
    setActiveSessionTaskId,
  } = useApp();

  // Find targeting task: explicitly selected task, or first uncompleted P1 task, or first uncompleted task
  const activeTask = useMemo(() => {
    if (activeSessionTaskId) {
      const found = tasks.find((t) => t.id === activeSessionTaskId);
      if (found) return found;
    }
    return (
      tasks.find(
        (t) =>
          !t.completed &&
          (t.priority?.includes("P1") || t.priority?.includes("Urgent"))
      ) ||
      tasks.find((t) => !t.completed) ||
      tasks[0] ||
      null
    );
  }, [tasks, activeSessionTaskId]);

  // Ambient soundscape mode: 'off' | 'rain' | 'binaural' | 'brown'
  const [ambientSound, setAmbientSound] = useState("off");
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const audioContextRef = useRef(null);
  const soundNodesRef = useRef([]);

  // Subtasks state for active task
  const [subtaskList, setSubtaskList] = useState([]);

  useEffect(() => {
    if (activeTask?.subtaskItems) {
      setSubtaskList(activeTask.subtaskItems);
    } else {
      setSubtaskList([
        { id: "sub-1", text: "Deep Focus Session Block - Core Execution", done: false },
        { id: "sub-2", text: "Code review & verification testing", done: false },
      ]);
    }
  }, [activeTask?.id]);

  // Handle Web Audio Soundscape generation
  useEffect(() => {
    if (!isOpen || ambientSound === "off") {
      stopAmbientSound();
      return;
    }
    startAmbientSound(ambientSound, ambientVolume);

    return () => {
      stopAmbientSound();
    };
  }, [ambientSound, isOpen, ambientVolume]);

  const stopAmbientSound = () => {
    try {
      soundNodesRef.current.forEach((node) => {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      });
      soundNodesRef.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch (e) {
      console.warn("Sound stop warning:", e);
    }
  };

  const startAmbientSound = (type, volume) => {
    stopAmbientSound();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
      masterGain.connect(ctx.destination);

      if (type === "binaural") {
        // 40Hz Gamma wave focus (Left ear 200Hz, Right ear 240Hz)
        const merger = ctx.createChannelMerger(2);

        const oscL = ctx.createOscillator();
        oscL.type = "sine";
        oscL.frequency.setValueAtTime(200, ctx.currentTime);

        const oscR = ctx.createOscillator();
        oscR.type = "sine";
        oscR.frequency.setValueAtTime(240, ctx.currentTime);

        const gainL = ctx.createGain();
        gainL.gain.setValueAtTime(0.3, ctx.currentTime);
        const gainR = ctx.createGain();
        gainR.gain.setValueAtTime(0.3, ctx.currentTime);

        oscL.connect(gainL);
        oscR.connect(gainR);

        gainL.connect(merger, 0, 0);
        gainR.connect(merger, 0, 1);
        merger.connect(masterGain);

        oscL.start();
        oscR.start();
        soundNodesRef.current.push(oscL, oscR, gainL, gainR, merger, masterGain);
      } else if (type === "rain" || type === "brown") {
        // Filtered noise generator
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === "brown") {
            // Brown noise: integrate white noise
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          } else {
            // Rain noise: pink noise approximation
            output[i] = (lastOut + 0.05 * white) / 1.05;
            lastOut = output[i];
            output[i] *= 2.0;
          }
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = type === "brown" ? "lowpass" : "bandpass";
        filter.frequency.setValueAtTime(type === "brown" ? 380 : 800, ctx.currentTime);
        filter.Q.setValueAtTime(1.0, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(masterGain);
        whiteNoise.start();

        soundNodesRef.current.push(whiteNoise, filter, masterGain);
      }
    } catch (e) {
      console.warn("Could not start ambient sound:", e);
    }
  };

  // Keyboard navigation within Zen Mode
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // Escape or F to exit Zen
      if (e.key === "Escape" || (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        onClose();
        return;
      }

      // Space to toggle timer
      if (e.code === "Space" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        if (timerRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
        return;
      }

      // Enter to complete active task and pull next
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey || e.target.tagName !== "INPUT")) {
        e.preventDefault();
        handleCompleteAndNext();
        return;
      }

      // 1, 2, 3 to change priority
      if (activeTask && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        if (e.key === "1") {
          updateTask(activeTask.id, { priority: "P1 Urgent & High Impact" });
        } else if (e.key === "2") {
          updateTask(activeTask.id, { priority: "P2 Strategic" });
        } else if (e.key === "3") {
          updateTask(activeTask.id, { priority: "P3 Maintenance" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, timerRunning, activeTask, onClose]);

  const handleCompleteAndNext = async () => {
    if (!activeTask) return;
    await toggleTaskCompletion(activeTask.id);

    // Find next uncompleted task
    const nextTask = tasks.find(
      (t) =>
        t.id !== activeTask.id &&
        !t.completed &&
        (t.priority?.includes("P1") || t.priority?.includes("Urgent"))
    ) || tasks.find((t) => t.id !== activeTask.id && !t.completed);

    if (nextTask) {
      setActiveSessionTaskId(nextTask.id);
    }
  };

  const handleToggleSubtask = (subId) => {
    const updated = subtaskList.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
    setSubtaskList(updated);
    if (activeTask) {
      updateTask(activeTask.id, { subtaskItems: updated });
    }
  };

  if (!isOpen) return null;

  const priorityStyle = activeTask ? getLabelStyle(activeTask.priority) : null;
  const categoryStyle = activeTask ? getLabelStyle(activeTask.category) : null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl text-slate-100 flex flex-col justify-between p-6 sm:p-10 select-none animate-in fade-in duration-200">
      {/* Dynamic Circadian Ambient Glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/20 rounded-full blur-[140px] opacity-70" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 w-[500px] h-[400px] bg-secondary/15 rounded-full blur-[120px] opacity-60" />

      {/* TOP HEADER */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]">self_improvement</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white uppercase flex items-center gap-2">
              <span>Zen Focus Deck</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h1>
            <p className="text-[11px] text-slate-400">Deep Work Immersion • Distraction-free</p>
          </div>
        </div>

        {/* Ambient Soundscape Controller */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-full p-1 shadow-lg">
          <span className="material-symbols-outlined text-slate-400 text-[18px] pl-2">headphones</span>
          <div className="flex items-center gap-1">
            {[
              { id: "off", label: "Mute" },
              { id: "rain", label: "Rain" },
              { id: "binaural", label: "40Hz Gamma" },
              { id: "brown", label: "Brown Noise" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setAmbientSound(s.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  ambientSound === s.id
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {ambientSound !== "off" && (
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={ambientVolume}
              onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
              className="w-16 h-1 mx-2 accent-primary cursor-pointer"
              title="Volume"
            />
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
            title="Exit Zen Deck (Esc or F)"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </header>

      {/* CENTER STAGE: TIMER & ACTIVE TASK */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto max-w-2xl mx-auto w-full text-center space-y-6">
        {/* Timer Ring */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_25px_rgba(99,102,241,0.25)]" viewBox="0 0 100 100">
            <circle
              className="text-slate-800/80"
              cx="50"
              cy="50"
              fill="none"
              r="44"
              stroke="currentColor"
              strokeWidth="5"
            />
            <circle
              className="text-primary transition-all duration-1000 ease-linear"
              cx="50"
              cy="50"
              fill="none"
              r="44"
              stroke="currentColor"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 * (1 - Math.max(0, timerSeconds) / (25 * 60))}
              strokeLinecap="round"
              strokeWidth="5"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-tabular-mono text-5xl sm:text-7xl font-extrabold tracking-tighter text-white">
              {formattedTimer}
            </span>
            <span className="text-[12px] uppercase tracking-widest text-slate-400 mt-2 font-semibold">
              {timerRunning ? "Deep Focus Stream" : "Flow Standby"}
            </span>
          </div>
        </div>

        {/* Task Card Container */}
        {activeTask ? (
          <div className="w-full bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md text-left space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {priorityStyle && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${priorityStyle.bg} ${priorityStyle.border}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
                    {activeTask.priority}
                  </span>
                )}
                {categoryStyle && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${categoryStyle.bg} ${categoryStyle.border}`}>
                    {activeTask.category}
                  </span>
                )}
                <span className="font-tabular-mono text-[11px] text-slate-400">
                  {activeTask.duration || "30 min"}
                </span>
              </div>

              {/* Task Switcher dropdown */}
              <select
                value={activeTask.id}
                onChange={(e) => setActiveSessionTaskId(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 outline-none cursor-pointer max-w-[200px] truncate"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.completed ? "✓ " : ""}{t.title}
                  </option>
                ))}
              </select>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              {activeTask.title}
            </h2>

            {activeTask.description && (
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {activeTask.description}
              </p>
            )}

            {/* Checklist of subtasks */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Session Checklist
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {subtaskList.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => handleToggleSubtask(sub.id)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer text-xs transition-colors"
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        sub.done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-600 bg-slate-900"
                      }`}
                    >
                      {sub.done && <span className="material-symbols-outlined text-[12px]">check</span>}
                    </span>
                    <span className={sub.done ? "line-through text-slate-500" : "text-slate-300"}>
                      {sub.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-sm">
            No active task selected. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono">C</kbd> to quick-create or select one from the dashboard.
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTimerSeconds((s) => s + 5 * 60)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors font-medium text-xs flex items-center gap-1.5 cursor-pointer"
            title="Extend Focus (+5m)"
          >
            <span className="material-symbols-outlined text-[16px]">more_time</span>
            <span>+5m</span>
          </button>

          <button
            type="button"
            onClick={() => (timerRunning ? pauseTimer() : startTimer())}
            className="w-14 h-14 rounded-2xl bg-primary hover:bg-primary-container text-white flex items-center justify-center transition-all shadow-[0_0_25px_rgba(99,102,241,0.5)] cursor-pointer hover:scale-105"
            title={timerRunning ? "Pause (Space)" : "Resume (Space)"}
          >
            <span className="material-symbols-outlined text-[28px]">
              {timerRunning ? "pause" : "play_arrow"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCompleteAndNext}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer hover:scale-105"
            title="Mark Done & Pull Next (Enter)"
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            <span>Done &amp; Next</span>
          </button>

          <button
            type="button"
            onClick={() => resetTimer()}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Timer"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </main>

      {/* FOOTER KEYBOARD SHORTCUTS REFERENCE */}
      <footer className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900 pt-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Space</kbd> Play / Pause
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Enter</kbd> Done &amp; Next
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">1-3</kbd> Set Priority
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc / F</kbd> Exit Zen
          </span>
        </div>
        <span className="hidden sm:inline">Circadian Flow State • Successor Deck</span>
      </footer>
    </div>
  );
}
