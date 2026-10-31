import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import successorLogo from "../assets/logo.png";
import { useApp } from "../context/AppContext";

/**
 * Successor Cinematic Loading Page
 * Displays a high-tech animated loading experience featuring the official Successor
 * 3D brand artwork, staged cognitive telemetry, and concentric energy pulses
 * after login, before launching into the dashboard.
 */
export default function LoadingScreen() {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useApp();

  const [progress, setProgress] = useState(12);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const isCredentialless =
    Boolean(currentUser?.isAnonymous) ||
    Boolean(userProfile?.isCredentialless) ||
    Boolean(userProfile?.isGuest) ||
    localStorage.getItem("successor_credentialless") === "true" ||
    localStorage.getItem("successor_guest_session") === "true";

  // Staged loading phase telemetry messages
  const getPhaseMessage = (pct) => {
    if (pct < 24) {
      return isCredentialless
        ? "Establishing secure credentialless session..."
        : "Authenticating workstation credentials...";
    }
    if (pct < 48) {
      return isCredentialless
        ? "Mounting isolated workspace & task trajectories..."
        : "Syncing cognitive workspace & task trajectories...";
    }
    if (pct < 72) return "Calibrating circadian chronotype & focus blocks...";
    if (pct < 92) return "Optimizing task DAG with Rust Algorithmic Rebalancer...";
    return "Cognitive workstation ready. Launching dashboard...";
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isDemo = searchParams.get("demo") === "true" || searchParams.get("pause") === "true";

    if (isDemo) {
      setProgress(68);
      return;
    }

    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const totalDuration = prefersReducedMotion ? 800 : 2600; // ~2.6 seconds
    const intervalTime = 40;
    const increment = 100 / (totalDuration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(100, prev + increment + (Math.random() * 1.5 - 0.5));
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 400);
          }, 300);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [navigate]);

  const displayName =
    userProfile?.displayName ||
    currentUser?.displayName ||
    (isCredentialless ? "" : currentUser?.email?.split("@")[0]) ||
    "";

  return (
    <div
      style={{ backgroundColor: "#060813", color: "#ffffff" }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between min-h-screen select-none overflow-hidden transition-all duration-400 ease-out ${
        isFadingOut ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient Gradient Orbs */}
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-35 blur-[120px] pointer-events-none animate-successor-glow"
          style={{ background: "radial-gradient(circle, #4648d4 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-25 blur-[130px] pointer-events-none animate-successor-glow [animation-delay:2s]"
          style={{ background: "radial-gradient(circle, #006c49 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full opacity-20 blur-[140px] pointer-events-none"
          style={{ background: "radial-gradient(circle, #6063ee 0%, transparent 70%)" }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* TOP BAR: Subtle session status indicator */}
      <header className="relative z-10 w-full max-w-5xl px-6 py-6 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </span>
          <span className="font-mono tracking-wider uppercase text-[11px] text-white/70">
            {isCredentialless ? "Initializing Session" : "Activating Session"}
          </span>
        </div>
      </header>

      {/* CENTER: Successor Image Hero with Animated Rings & Glow */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto px-4 max-w-xl w-full text-center">
        {/* Animated concentric rings container with 16:9 Hero Card */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Outer Pulsing Wave Ring 1 */}
          <div className="absolute -inset-10 rounded-3xl border border-primary/30 animate-successor-pulse-ring-1 pointer-events-none" />

          {/* Outer Pulsing Wave Ring 2 (delayed) */}
          <div className="absolute -inset-14 rounded-3xl border border-secondary-fixed/20 animate-successor-pulse-ring-2 pointer-events-none" />

          {/* Rotating Dashed Accent Ring */}
          <div className="absolute -inset-6 rounded-3xl border border-dashed border-white/10 animate-successor-spin-slow pointer-events-none" />

          {/* Frosted Glass Hero Container with Successor Image */}
          <div className="relative z-10 w-80 sm:w-96 aspect-[16/9] rounded-2xl p-1 bg-gradient-to-br from-white/20 via-white/5 to-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_rgba(70,72,212,0.4)] animate-successor-float overflow-hidden">
            {/* Ambient Image Drop Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/20 filter blur-xl opacity-60 pointer-events-none" />

            {/* Successor Logo Image */}
            <img
              src={successorLogo}
              alt="Successor - Personal Task Tracker"
              className="relative z-10 w-full h-full object-cover rounded-xl filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
            />

            {/* Shimmer overlay beam */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-successor-shimmer pointer-events-none" />
          </div>
        </div>

        {/* Brand Title */}
        <div className="space-y-1.5 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">Successor</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-normal max-w-md mx-auto">
            Calibrating your personal focus environment &amp; peak performance cadence
          </p>
        </div>

        {/* PROGRESS TRACK & PERCENTAGE */}
        <div className="w-full max-w-sm space-y-2.5">
          {/* Progress Bar Container */}
          <div className="relative h-2.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/15 shadow-inner">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-[#4648d4] via-[#6063ee] to-[#4edea3] transition-all duration-150 ease-out shadow-[0_0_12px_rgba(96,99,238,0.7)]"
              style={{ width: `${Math.round(progress)}%` }}
            >
              {/* Shimmer sweep highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-successor-shimmer" />
            </div>
          </div>

          {/* Status Text & Monospace Percentage */}
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-white/80 font-medium truncate pr-2 text-left">
              {getPhaseMessage(progress)}
            </span>
            <span className="font-mono font-bold text-primary-fixed text-right shrink-0">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Telemetry Feature Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-7 text-[11px] text-white/60">
          {isCredentialless && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs text-emerald-300 font-medium">
              <span className="material-symbols-outlined text-[13px] text-emerald-400">vpn_key_off</span>
              <span>Credentialless Isolated</span>
            </span>
          )}
        </div>
      </main>

      {/* FOOTER: Skip button & copyright */}
      <footer className="relative z-10 w-full max-w-5xl px-6 py-6 flex items-center justify-between text-xs text-white/40">
        <span className="text-[11px] font-mono">v1.2 &bull; Desktop Native &amp; Web</span>
      </footer>
    </div>
  );
}
