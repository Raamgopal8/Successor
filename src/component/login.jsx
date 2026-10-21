import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (tab === "signin") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCred.user;
        if (displayName.trim()) {
          await updateProfile(user, { displayName: displayName.trim() });
        }
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            email: user.email,
            displayName: displayName.trim() || user.email.split("@")[0],
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
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
                        V1.0
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
                    Personalized productivity engineered for{" "}
                    <span className="text-[#4f52e2] italic font-serif font-medium">deep flow</span>.
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
                  <span className="text-[#1f2937]">SOC-2 Type II Certified</span>
                </span>
                <span className="text-[#9ca3af]">•</span>
                <span className="text-[#1f2937]">256-bit Flow Vault Encrypted</span>
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
                    className={`flex-1 py-2 rounded-md font-label-md text-label-md transition-all text-center cursor-pointer ${
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

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-lg bg-error-container text-error text-body-sm flex items-center space-x-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Social Quick Logins */}
                <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
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

                  {/* GitHub Button */}
                  <button
                    onClick={handleGithubSignIn}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all group disabled:opacity-50 cursor-pointer"
                    type="button"
                  >
                    <svg className="w-4 h-4 fill-current text-on-surface group-hover:scale-105 transition-transform" viewBox="0 0 24 24">
                      <path
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        fillRule="evenodd"
                      />
                    </svg>
                    <span>GitHub</span>
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
                          placeholder="Elena Vance"
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
                        placeholder="elena.vance@flow.design"
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
                        <a className="font-label-sm text-label-sm text-primary hover:text-primary-container transition-colors" href="#">
                          Forgot password?
                        </a>
                      )}
                    </div>
                    <div className="relative rounded-lg bg-surface-container-low transition-all focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/20">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                        lock
                      </span>
                      <input
                        className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-transparent font-body-md text-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/50"
                        id="password"
                        placeholder="Enter security passphrase"
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

                  {/* Workstation Checkbox */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary/30 accent-primary cursor-pointer"
                        type="checkbox"
                      />
                      <span className="font-body-sm text-body-sm text-on-surface">
                        Remember me on this workstation
                      </span>
                    </label>
                    <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                      30 Days
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

                {/* Passkey & SSO Options */}
                <div className="pt-space-xs text-center">
                  <button
                    className="inline-flex items-center space-x-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">passkey</span>
                    <span>Sign in with enterprise passkey / SSO</span>
                  </button>
                </div>

                {/* Security & Legal Footer */}
                <div className="pt-space-sm space-y-2 text-center">
                  <div className="inline-flex items-center justify-center space-x-1 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[15px] text-secondary">lock</span>
                    <span>End-to-End Workspace Isolation</span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant/80">
                    By authenticating, you accept Successor's{" "}
                    <a className="text-on-surface hover:underline font-medium" href="#">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a className="text-on-surface hover:underline font-medium" href="#">
                      Privacy Policy
                    </a>.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
