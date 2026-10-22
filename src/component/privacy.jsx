import React from "react";
import { Link } from "react-router-dom";
import image from "../assets/logo.png";

export default function Privacy() {
  const lastUpdated = "October 22, 2026";

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-space-sm group">
            <img alt="Successor Logo" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" src={image} />
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                Successor
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-semibold uppercase tracking-wider">
                Legal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/terms"
              className="text-body-sm text-on-surface-variant hover:text-on-surface font-medium transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/"
              className="px-4 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Document Title Banner */}
        <div className="space-y-3 border-b border-outline-variant/20 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-[12px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Privacy & Data Sovereignty Policy</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Last Updated: <span className="font-semibold text-on-surface">{lastUpdated}</span> • Effective Immediately
          </p>
        </div>

        {/* Executive Summary Card */}
        <section className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold font-headline-sm text-[16px]">
            <span className="material-symbols-outlined text-[20px]">shield</span>
            <span>Our Core Commitment to Your Privacy</span>
          </div>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            At Successor, we build tools that enhance cognitive flow, productivity, and circadian rhythm scheduling. 
            We do not sell, rent, or trade your personal data, task contents, habit records, or productivity metrics to data brokers, ad networks, or AI model vendors. 
            Your workspace data is encrypted and partitioned strictly to your authenticated identity.
          </p>
        </section>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            1. Information We Collect
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            We collect only the minimal data necessary to provide and sync your personal productivity workspace across your devices:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2">
              <h3 className="font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
                Account & Identity Data
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Work email, display name, profile avatar URL, and authentication credentials securely tokenized through Google Firebase Authentication.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-2">
              <h3 className="font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
                Workspace & Productivity Records
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                Task titles, categories, priorities, estimated durations, checklist completions, habit logs, focus sessions, and flow metrics stored in your personal cloud database.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            2. How Your Data Is Stored & Synchronized
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            Successor leverages a dual-layer synchronization model:
          </p>
          <ul className="list-disc list-inside space-y-2 text-on-surface-variant leading-relaxed pl-2">
            <li>
              <strong className="text-on-surface">Local-First Multi-Tab Persistence:</strong> Data is cached in your browser's encrypted IndexedDB storage so you can plan, track, and inspect your work offline.
            </li>
            <li>
              <strong className="text-on-surface">Cloud Firestore Synchronization:</strong> When connected, your records synchronize with Google Cloud Firestore under strict per-user access control rules (<code className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[13px]">request.auth.uid == userId</code>).
            </li>
            <li>
              <strong className="text-on-surface">In-Transit Encryption:</strong> All real-time data transmissions use TLS 1.3 encryption.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            3. Third-Party Services
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            We partner with enterprise cloud infrastructure providers exclusively to deliver core software functions:
          </p>
          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
              <span className="font-semibold text-on-surface">Google Firebase / Google Cloud Platform</span>
              <span className="font-mono text-label-sm text-outline">Auth, Cloud Firestore & Hosting</span>
            </div>
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
              <span className="font-semibold text-on-surface">GitHub / Google OAuth (Optional)</span>
              <span className="font-mono text-label-sm text-outline">Single Sign-On (SSO) identity verification</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-on-surface">Tauri Native Desktop Bridge</span>
              <span className="font-mono text-label-sm text-outline">Local filesystem storage for desktop releases</span>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            4. Your Rights & Data Control
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            You retain absolute sovereignty over your records. You may at any time:
          </p>
          <ul className="list-disc list-inside space-y-2 text-on-surface-variant leading-relaxed pl-2">
            <li>Edit, update, or purge any individual task, project, or habit from your workspace.</li>
            <li>Request full export of your metrics and workspace logs via the Analytics export utility.</li>
            <li>Request complete deletion of your account and associated database documents.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            5. Contact Information
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            If you have any questions, requests, or privacy concerns regarding this policy, reach out to our privacy engineering team at{" "}
            <a href="mailto:privacy@successor.app" className="text-primary hover:underline font-semibold">
              privacy@successor.app
            </a>.
          </p>
        </section>

        {/* Back Button */}
        <div className="pt-6 border-t border-outline-variant/20 flex items-center justify-between">
          <Link
            to="/terms"
            className="text-primary hover:underline font-medium text-body-sm flex items-center gap-1"
          >
            <span>Read Terms of Service</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
          >
            Return to Sign In
          </Link>
        </div>
      </main>
    </div>
  );
}
