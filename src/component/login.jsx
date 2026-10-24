import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const Login = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("signin"); // "signin" | "signup"
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  // Save or clear user workstation token for quick application login
  const saveWorkstationToken = async (user, shouldRemember) => {
    if (shouldRemember && user) {
      try {
        await setPersistence(auth, browserLocalPersistence);
        const token = await user.getIdToken(true);
        const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 Days expiration
        localStorage.setItem("successor_workstation_token", token);
        localStorage.setItem("successor_token_expiry", expiry.toString());
        localStorage.setItem("successor_remember_me", "true");
        if (user.email) {
          localStorage.setItem("successor_saved_email", user.email);
        }
      } catch (err) {
        console.warn("Could not save workstation token:", err);
      }
    } else {
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch (err) {
        console.warn("Could not set session persistence:", err);
      }
      localStorage.removeItem("successor_workstation_token");
      localStorage.removeItem("successor_token_expiry");
      localStorage.removeItem("successor_remember_me");
    }
  };

  // Auto-restore workstation session for quick login when enabled
  useEffect(() => {
    const savedRemember = localStorage.getItem("successor_remember_me");
    if (savedRemember !== null) {
      setRememberMe(savedRemember === "true");
    }

    const savedEmail = localStorage.getItem("successor_saved_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }

    const token = localStorage.getItem("successor_workstation_token");
    const expiry = localStorage.getItem("successor_token_expiry");
    const isTokenValid = token && (!expiry || Date.now() < Number(expiry));

    if (savedRemember === "true" && isTokenValid) {
      setQuickLoggingIn(true);
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            // Refresh workstation token & navigate
            const freshToken = await user.getIdToken();
            localStorage.setItem("successor_workstation_token", freshToken);
            navigate("/dashboard");
          } catch (err) {
            console.warn("Workstation token refresh failed:", err);
            setQuickLoggingIn(false);
          }
        } else {
          setQuickLoggingIn(false);
        }
      });
      return () => unsub();
    }
  }, [navigate]);

  const handleOpenForgotModal = (e) => {
    e?.preventDefault();
    setResetEmail(email.trim());
    setResetError("");
    setResetSuccess(false);
    setShowForgotModal(true);
  };

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);

    if (!resetEmail.trim()) {
      setResetError("Please enter your registered email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(true);
    } catch (err) {
      console.error("Password reset error:", err);
      const friendlyMsg =
        err.code === "auth/invalid-email"
          ? "Please provide a valid email address."
          : err.code === "auth/user-not-found"
          ? "No registered account found with this email."
          : err.code === "auth/too-many-requests"
          ? "Too many requests. Please wait a few moments and try again."
          : err.message || "Failed to send reset email. Please try again.";
      setResetError(friendlyMsg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      let loggedInUser;
      if (tab === "signin") {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        loggedInUser = userCred.user;
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        loggedInUser = userCred.user;
        if (displayName.trim()) {
          await updateProfile(loggedInUser, { displayName: displayName.trim() });
        }
        await setDoc(
          doc(db, "users", loggedInUser.uid),
          {
            uid: loggedInUser.uid,
            email: loggedInUser.email,
            displayName: displayName.trim() || loggedInUser.email.split("@")[0],
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await saveWorkstationToken(loggedInUser, rememberMe);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      const friendlyMessage =
        err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password"
          ? "Invalid email or password."
          : err.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : err.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : err.message || "Authentication failed.";
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          avatarUrl: user.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await saveWorkstationToken(user, rememberMe);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GithubAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0],
          avatarUrl: user.photoURL || "",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await saveWorkstationToken(user, rememberMe);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to sign in with GitHub.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased flex items-center justify-center min-h-screen selection:bg-primary/20">
      <main className="w-full flex items-center justify-center p-space-md">
        <div className="flex flex-col w-full max-w-7xl mx-auto py-space-md lg:py-space-xl px-gutter-mobile md:px-margin">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-center min-h-[calc(100vh-4rem)]">
            
            {/* LEFT SIDE: Brand & Storytelling */}
            <div className="lg:col-span-6 flex flex-col justify-between py-6 lg:pr-8 space-y-8">
              <div className="space-y-6">
                {/* Logo & Brand Badge */}
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#edeefc] flex items-center justify-center p-2 shadow-sm border border-[#e1e2f6]">
                    <svg
                      className="w-7 h-7 text-[#5b5de8]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-['Plus_Jakarta_Sans'] text-[22px] font-bold text-[#131b2e] tracking-tight">
                        Successor
                      </span>
                      <span className="bg-[#edeefc] text-[#5558e6] text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        V1.2
                      </span>
                    </div>
                    <p className="text-[13px] text-[#555a6d] font-normal tracking-normal -mt-0.5">
                      Cognitive Workspace Engine
                    </p>
                  </div>
                </div>

                {/* Headline & Tagline */}
                <div className="space-y-3 pt-1">
                  <div className="inline-flex items-center space-x-1.5 bg-[#d4f8e8] px-3.5 py-1.5 rounded-full text-[#0a8754]">
                    <span className="material-symbols-outlined text-[17px] font-semibold">bolt</span>
                    <span className="text-[12.5px] font-semibold tracking-tight">
                      Optimized for Ultra-Deep Focus
                    </span>
                  </div>

                  <h1 className="font-['Plus_Jakarta_Sans'] text-[42px] lg:text-[46px] font-extrabold text-[#111827] leading-[1.12] tracking-[-0.03em]">
                    Personalized productivity engine for deep{" "}
                    <span className="text-[#4f52e2] italic font-serif font-medium">work flow</span>.
                  </h1>

                  <p className="text-[16px] text-[#4b5563] max-w-lg leading-relaxed pt-1">
                    Align your daily tasks with your natural energy rhythms and peak hours. Eliminate friction before work begins.
                  </p>
                </div>
              </div>

              {/* Left Footer Metadata */}
              <div className="flex items-center space-x-3 text-[#4b5563] text-[13px] font-medium pt-2">
                <span className="flex items-center space-x-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#0a8754]">verified_user</span>
                  <span className="text-[#1f2937]">Montior Daily Rhythms</span>
                </span>
                <span className="text-[#9ca3af]">•</span>
                <span className="text-[#1f2937]">Begin Deep Work</span>
              </div>
            </div>

            {/* RIGHT SIDE: Authentication Card */}
            <div className="lg:col-span-6 flex justify-center w-full">
              <div className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-xl p-space-lg lg:p-space-xl flex flex-col space-y-space-md transition-all border border-outline-variant/20">
                
                {/* Segmented Control: Sign In / Create Account */}
                <div className="bg-surface-container p-1 rounded-lg flex items-center">
                  <button
                    className={`flex-1 py-2 rounded-md font-label-md text-label-md transition-all text-center cursor-pointer ${
                      tab === "signin"
                        ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    onClick={() => {
                      setTab("signin");
                      setError("");
                    }}
                    type="button"
                  >
                    Sign In
                  </button>
                  <button
                    className={`flex-1 py-2 ml-6 rounded-md font-label-md text-label-md transition-all text-center cursor-pointer ${
                      tab === "signup"
                        ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    onClick={() => {
                      setTab("signup");
                      setError("");
                    }}
                    type="button"
                  >
                    Create Account
                  </button>
                </div>

                {/* Greeting Block */}
                <div className="space-y-1">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {tab === "signin" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {tab === "signin"
                      ? "Access your synchronized workspaces and flow sessions."
                      : "Start tracking tasks with local sync and cloud storage."}
                  </p>
                </div>

                {/* Quick-Login In-Progress Banner */}
                {quickLoggingIn && (
                  <div className="p-3.5 rounded-xl bg-primary-container/30 border border-primary/20 text-on-primary-container text-body-sm flex items-center gap-2.5 animate-pulse">
                    <span className="material-symbols-outlined text-[20px] text-primary animate-spin">
                      progress_activity
                    </span>
                    <span className="font-medium">
                      Workstation token verified. Restoring workspace...
                    </span>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center space-x-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Social Quick Logins */}
                <div className="grid grid-cols-1 gap-space-sm pt-space-xs">
                  {/* Google Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all group disabled:opacity-50 cursor-pointer"
                    type="button"
                  >
                    <svg className="w-4 h-4 group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Google</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative flex items-center justify-center my-1">
                  <div className="w-full h-px bg-outline-variant/30" />
                  <span className="bg-surface-container-lowest px-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider absolute">
                    or continue with email
                  </span>
                </div>

                {/* Email & Password Form */}
                <form className="space-y-space-md" onSubmit={handleSubmit}>
                  {/* Optional Name for Sign Up */}
                  {tab === "signup" && (
                    <div className="space-y-1.5">
                      <label className="block font-label-md text-label-md text-on-surface font-medium" htmlFor="displayName">
                        Full Name
                      </label>
                      <div className="relative rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                          person
                        </span>
                        <input
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                          id="displayName"
                          placeholder=""
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="block font-label-md text-label-md text-on-surface font-medium" htmlFor="email">
                      Work Email
                    </label>
                    <div className="relative rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                        mail
                      </span>
                      <input
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                        id="email"
                        placeholder=""
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-label-md text-label-md text-on-surface font-medium" htmlFor="password">
                        Password
                      </label>
                      {tab === "signin" && (
                        <button
                          type="button"
                          onClick={handleOpenForgotModal}
                          className="font-label-sm text-label-sm text-primary hover:text-primary-container hover:underline transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                        lock
                      </span>
                      <input
                        className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                        id="password"
                        placeholder=""
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-0.5 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Workstation Checkbox & Token Indicator */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
                      <input
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface group-hover:text-primary transition-colors">
                        Remember me on this workstation
                      </span>
                    </label>
                    <span
                      title={rememberMe ? "Generates a secure 30-day workstation token for automatic quick login" : "Session token expires when the application window closes"}
                      className={`font-label-sm text-label-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all select-none ${
                        rememberMe
                          ? "bg-secondary-container/40 text-on-secondary-container font-semibold border border-secondary/20"
                          : "bg-surface-container text-on-surface-variant/70"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] text-secondary">
                        {rememberMe ? "token" : "lock_clock"}
                      </span>
                      <span>{rememberMe ? "30 Days Token Active" : "Session Only"}</span>
                    </span>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    className="w-full bg-primary hover:bg-primary-container text-on-primary py-3 px-space-md rounded-lg font-label-md text-label-md flex items-center justify-center space-x-2 transition-all shadow-md hover:shadow-lg active:scale-[0.99] group cursor-pointer disabled:opacity-50"
                    type="submit"
                    disabled={loading}
                  >
                    <span className="font-semibold tracking-wide">
                      {loading
                        ? "Connecting..."
                        : tab === "signin"
                        ? "Sign In to Workspace"
                        : "Create Workspace Account"}
                    </span>
                    <span className="bg-on-primary/20 text-on-primary text-[10px] px-1.5 py-0.5 rounded font-tabular-mono tracking-tighter group-hover:bg-on-primary/30 transition-colors">
                      Enter ↵
                    </span>
                  </button>
                </form>

                {/* Security & Legal Footer */}
                <div className="pt-space-sm space-y-2 text-center">
                  <div className="inline-flex items-center justify-center space-x-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[15px] text-secondary">lock</span>
                    <span>End-to-End Workspace Isolation</span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant/80">
                    By authenticating, you accept Successor's{" "}
                    <Link className="text-on-surface hover:underline font-medium" to="/terms">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link className="text-on-surface hover:underline font-medium" to="/privacy">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl p-6 space-y-4 border border-outline-variant/30 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                </div>
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Reset Password</h3>
                  <p className="text-[12px] text-on-surface-variant">Successor Security</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Enter your registered work email address below. We'll send you an instant link to reset your password.
            </p>

            {/* Success message banner */}
            {resetSuccess && (
              <div className="p-3.5 rounded-xl bg-secondary-container/30 border border-secondary/30 text-on-surface text-body-sm space-y-1">
                <div className="flex items-center gap-2 text-secondary font-semibold">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Reset Link Dispatched</span>
                </div>
                <p className="text-[13px] text-on-surface-variant pl-6">
                  A password reset email has been sent to <strong className="text-on-surface">{resetEmail}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
            )}

            {/* Error message banner */}
            {resetError && (
              <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center space-x-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleSendResetEmail} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block font-label-md text-label-md text-on-surface font-medium" htmlFor="resetEmail">
                  Registered Email Address
                </label>
                <div className="relative rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    mail
                  </span>
                  <input
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                    id="resetEmail"
                    placeholder="name@example.com"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-md text-label-md transition-colors cursor-pointer"
                >
                  {resetSuccess ? "Back to Sign In" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {resetLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>{resetSuccess ? "Resend Link" : "Send Reset Link"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
