import React, { useState, useEffect } from "react";
import {
  Download,
  Terminal,
  Monitor,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  RefreshCw,
  Info,
} from "lucide-react";

export default function LandingPage() {
  const [versionData, setVersionData] = useState({
    version: "0.1.7",
    releaseDate: "Latest",
    platforms: {
      windows: {
        available: true,
        url: "/downloads/successor-latest-windows-x64.exe",
        filename: "Successor_0.1.7_x64-setup.exe",
        size: "~15 MB",
      },
      "linux-deb": {
        available: true,
        url: "/downloads/successor-latest-linux.deb",
        filename: "successor_0.1.7_amd64.deb",
        size: "12 MB",
      },
    },
  });

  // Pull latest version configuration directly from Firebase Hosting (/version.json)
  useEffect(() => {
    async function loadVersion() {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setVersionData(data);
        }
      } catch (err) {
        console.warn("Could not load /version.json:", err);
      }
    }
    loadVersion();
  }, []);

  const currentVersion = `v${versionData.version}`;
  const windowsDownload = versionData.platforms?.windows?.url || "/downloads/successor-latest-windows-x64.exe";
  const linuxDebDownload = versionData.platforms?.["linux-deb"]?.url || "/downloads/successor-latest-linux.deb";
  
  return (
    <div style={styles.container}>
      {/* Background Glow */}
      <div style={styles.bgGlowPurple} />
      <div style={styles.bgGlowCyan} />

      {/* Navigation */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoBadge}>S</div>
          <span style={styles.brandTitle}>Successor</span>
          <span style={styles.versionPill}>{currentVersion}</span>
        </div>
        <nav style={styles.navLinks}>
          <a href="#downloads" style={styles.navLink}>
            Downloads
          </a>
          <a href="#features" style={styles.navLink}>
            Features
          </a>
          <a href="#installation" style={styles.navLink}>
            Install Guide
          </a>
          <a href="/login" style={styles.appBtn}>
            Open Web App
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.taglineBadge}>
          <Sparkles size={14} color="#a855f7" style={{ marginRight: 6 }} />
          <span>Next-Generation Productivity & Flow OS</span>
        </div>
        <h1 style={styles.heroHeading}>
          Master Your Focus. <br />
          <span style={styles.gradientText}>Elevate Your Output.</span>
        </h1>
        <p style={styles.heroSubtext}>
          Successor is a native desktop experience engineered to organize workflows,
          track projects, and execute with deep focus. Download directly below.
        </p>

        {/* Primary Download Buttons (Direct Site Downloads) */}
        <div style={styles.ctaGroup} id="downloads">
          <a
            href={windowsDownload}
            download={versionData.platforms?.windows?.filename || "Successor_Setup.exe"}
            style={styles.primaryButton}
          >
            <Monitor size={22} />
            <div style={styles.buttonTextWrapper}>
              <span style={styles.btnAction}>Download for Windows</span>
              <span style={styles.btnMeta}>.exe installer (64-bit)</span>
            </div>
            <Download size={18} />
          </a>

          <a
            href={linuxDebDownload}
            download={versionData.platforms?.["linux-deb"]?.filename || "successor_amd64.deb"}
            style={styles.secondaryButton}
          >
            <Terminal size={22} />
            <div style={styles.buttonTextWrapper}>
              <span style={styles.btnAction}>Download for Linux</span>
              <span style={styles.btnMeta}>.deb (Ubuntu / Debian)</span>
            </div>
            <Download size={18} />
          </a>
        </div>

        {/* In-app Auto Update Notice */}
        <div style={styles.updateCard}>
          <div style={styles.updateCardIcon}>
            <RefreshCw size={22} color="#38bdf8" />
          </div>
          <div style={styles.updateCardContent}>
            <div style={styles.updateTitleRow}>
              <strong style={{ color: "#f8fafc" }}>
                Built-in Automatic Updater
              </strong>
              <span style={styles.autoUpdateBadge}>Always Up to Date</span>
            </div>
            <p style={styles.updateCardDesc}>
              Once installed, Successor silently checks for new versions and updates itself
              automatically in the background. You only ever need to download once.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section style={styles.featuresSection} id="features">
        <h2 style={styles.sectionHeading}>Engineered for Peak Performance</h2>
        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <Zap size={24} color="#f59e0b" />
            </div>
            <h3 style={styles.featureTitle}>Instant Native Response</h3>
            <p style={styles.featureDesc}>
              Powered by Tauri v2 and Rust for lightweight memory footprint and
              near-instantaneous launch times.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <Layers size={24} color="#8b5cf6" />
            </div>
            <h3 style={styles.featureTitle}>Unified Project Boards</h3>
            <p style={styles.featureDesc}>
              Track tasks, manage priority timelines, and navigate workflow
              stages seamlessly without clutter.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <h3 style={styles.featureTitle}>Cloud Sync & Security</h3>
            <p style={styles.featureDesc}>
              Real-time synchronization powered by Firebase with authenticated
              multi-device access and backup.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Instructions */}
      <section style={styles.instructionsSection} id="installation">
        <h2 style={styles.sectionHeading}>Installation Guide</h2>
        <div style={styles.installGrid}>
          <div style={styles.installBox}>
            <h4 style={styles.installTitle}>Windows (.exe)</h4>
            <ol style={styles.orderedList}>
              <li>Click <strong>Download for Windows</strong> above.</li>
              <li>Run the downloaded <code>.exe</code> installer.</li>
              <li>Launch Successor from your Start Menu or Desktop.</li>
            </ol>
          </div>

          <div style={styles.installBox}>
            <h4 style={styles.installTitle}>Linux (.deb & .AppImage)</h4>
            <p style={styles.installHint}>For Debian/Ubuntu, install via terminal:</p>
            <div style={styles.codeSnippet}>
              <code>sudo dpkg -i successor_*_amd64.deb</code>
            </div>
            <p style={styles.installHint}>
              For <code>.AppImage</code>: Right click &gt; Properties &gt; Permissions &gt; "Allow executing file", or run:
            </p>
            <div style={styles.codeSnippet}>
              <code>chmod +x successor_*.AppImage && ./successor_*.AppImage</code>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} Successor. Built with Tauri v2, React & Firebase.
        </p>
        <div style={styles.footerLinks}>
          <a href="/privacy" style={styles.footerLink}>
            Privacy Policy
          </a>
          <span style={{ color: "#475569" }}>•</span>
          <a href="/terms" style={styles.footerLink}>
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#090d16",
    color: "#e2e8f0",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    position: "relative",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  bgGlowPurple: {
    position: "absolute",
    top: "-150px",
    left: "15%",
    width: "600px",
    height: "600px",
    background:
      "radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgGlowCyan: {
    position: "absolute",
    top: "-100px",
    right: "15%",
    width: "550px",
    height: "550px",
    background:
      "radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 48px",
    zIndex: 10,
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(12px)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoBadge: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
    color: "#ffffff",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    boxShadow: "0 4px 14px rgba(168, 85, 247, 0.4)",
  },
  brandTitle: {
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: "#f8fafc",
  },
  versionPill: {
    fontSize: "12px",
    padding: "3px 8px",
    borderRadius: "9999px",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    fontWeight: 600,
    border: "1px solid rgba(168, 85, 247, 0.3)",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "28px",
  },
  navLink: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: 500,
  },
  appBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    color: "#f1f5f9",
    fontSize: "13px",
    fontWeight: 600,
  },
  heroSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "70px 24px 50px",
    maxWidth: "880px",
    margin: "0 auto",
    zIndex: 1,
  },
  taglineBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "9999px",
    backgroundColor: "rgba(168, 85, 247, 0.1)",
    border: "1px solid rgba(168, 85, 247, 0.25)",
    fontSize: "13px",
    color: "#d8b4fe",
    marginBottom: "24px",
  },
  heroHeading: {
    fontSize: "52px",
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-1.5px",
    color: "#f8fafc",
    margin: "0 0 20px 0",
  },
  gradientText: {
    background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtext: {
    fontSize: "18px",
    lineHeight: 1.6,
    color: "#94a3b8",
    maxWidth: "640px",
    marginBottom: "40px",
  },
  ctaGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: "40px",
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 24px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #9333ea 0%, #2563eb 100%)",
    color: "#ffffff",
    boxShadow: "0 10px 25px -5px rgba(147, 51, 234, 0.5)",
    textAlign: "left",
  },
  secondaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 24px",
    borderRadius: "12px",
    backgroundColor: "#1e293b",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    color: "#f8fafc",
    textAlign: "left",
  },
  tertiaryButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "14px 20px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: 500,
  },
  buttonTextWrapper: {
    display: "flex",
    flexDirection: "column",
  },
  btnAction: {
    fontWeight: 600,
    fontSize: "15px",
  },
  btnMeta: {
    fontSize: "12px",
    opacity: 0.8,
  },
  updateCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "18px 24px",
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    borderRadius: "16px",
    maxWidth: "700px",
    width: "100%",
    backdropFilter: "blur(10px)",
    textAlign: "left",
  },
  updateCardIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  updateCardContent: {
    flex: 1,
  },
  updateTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "4px",
  },
  autoUpdateBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "2px 8px",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    borderRadius: "6px",
  },
  updateCardDesc: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
    lineHeight: 1.45,
  },
  featuresSection: {
    maxWidth: "1080px",
    margin: "40px auto",
    padding: "0 24px",
    textAlign: "center",
    zIndex: 1,
  },
  sectionHeading: {
    fontSize: "30px",
    fontWeight: 700,
    color: "#f8fafc",
    marginBottom: "40px",
    letterSpacing: "-0.5px",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
  },
  featureCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "32px 24px",
    textAlign: "left",
  },
  featureIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px",
  },
  featureTitle: {
    fontSize: "18px",
    fontWeight: 600,
    color: "#f8fafc",
    marginBottom: "10px",
  },
  featureDesc: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  instructionsSection: {
    maxWidth: "880px",
    margin: "40px auto 60px",
    padding: "0 24px",
    width: "100%",
    zIndex: 1,
  },
  installGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "24px",
  },
  installBox: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "14px",
    padding: "24px",
  },
  installTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#f1f5f9",
    marginTop: 0,
    marginBottom: "14px",
  },
  orderedList: {
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: 1.8,
    paddingLeft: "20px",
    margin: 0,
  },
  codeSnippet: {
    backgroundColor: "#020617",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: "13px",
    marginBottom: "12px",
  },
  installHint: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "6px 0 10px",
    lineHeight: 1.5,
  },
  footer: {
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "32px 48px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "13px",
    color: "#64748b",
    marginTop: "auto",
    zIndex: 1,
    flexWrap: "wrap",
    gap: "16px",
  },
  footerLinks: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  footerLink: {
    color: "#94a3b8",
    fontSize: "13px",
  },
};
