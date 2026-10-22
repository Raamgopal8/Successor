import React from "react";
import { Link } from "react-router-dom";
import image from "../assets/logo.png";

export default function Terms() {
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
              to="/privacy"
              className="text-body-sm text-on-surface-variant hover:text-on-surface font-medium transition-colors"
            >
              Privacy Policy
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/40 text-on-primary-container font-label-sm text-[12px] font-semibold">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            <span>Terms of Service Agreement</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            Terms of Service
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Last Updated: <span className="font-semibold text-on-surface">{lastUpdated}</span> • Version 1.0
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-4">
          <p className="text-on-surface-variant leading-relaxed text-body-lg">
            Welcome to <strong>Successor</strong> ("the Platform," "we," "us," or "our"). 
            By creating an account, accessing, or using the Successor web or desktop application, 
            you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using our software.
          </p>
        </section>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            1. Account Registration & Security
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            To use Successor, you must register using a valid email and password or an authorized single sign-on (SSO) provider (such as Google or GitHub). 
            You are responsible for safeguarding your login credentials and for any activity under your account. 
            If you suspect unauthorized access, please notify us immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            2. Permitted Use & Conduct
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            Successor is provided for personal, professional, and team productivity management. You agree not to:
          </p>
          <ul className="list-disc list-inside space-y-2 text-on-surface-variant leading-relaxed pl-2">
            <li>Reverse engineer, decompile, or extract the source code of the application or backend APIs beyond permitted open interfaces.</li>
            <li>Use automated bots or scrapers that place unreasonable loads on the synchronization infrastructure.</li>
            <li>Store or transmit harmful software, malware, or unlawful content in task queues or note attachments.</li>
            <li>Attempt to bypass or tamper with cloud security rules or authentication mechanisms.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            3. User Content & Intellectual Property
          </h2>
          <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-3">
            <h3 className="font-semibold text-on-surface">Your Content Belongs to You</h3>
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              You retain full intellectual property ownership of all tasks, descriptions, notes, sprint logs, and custom metrics you create in Successor. 
              We claim no ownership, copyright, or moral rights over your data.
            </p>
          </div>
          <p className="text-on-surface-variant leading-relaxed">
            The software, user interface design, logo, branding, and algorithms powering circadian cadence alignment are the intellectual property of Successor and its licensors.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            4. Service Availability & Modifications
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            We continuously improve Successor. We reserve the right to update features, perform maintenance, or enhance backend systems. 
            Because Successor includes local-first offline caching, you retain access to your cached workspace even during temporary network interruptions.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            5. Disclaimer of Warranties
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            Successor is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. 
            While we strive for 99.9% synchronization uptime and robust data persistence, we cannot guarantee uninterrupted service.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            6. Termination & Contact
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            You may terminate your account at any time. We reserve the right to suspend accounts that violate these Terms. 
            For inquiries regarding these Terms of Service, contact{" "}
            <a href="mailto:support@successor.app" className="text-primary hover:underline font-semibold">
              support@successor.app
            </a>.
          </p>
        </section>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-outline-variant/20 flex items-center justify-between">
          <Link
            to="/privacy"
            className="text-primary hover:underline font-medium text-body-sm flex items-center gap-1"
          >
            <span>Read Privacy Policy</span>
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
