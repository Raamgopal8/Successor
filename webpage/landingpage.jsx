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
  Copy,
  Check,
  Cpu,
} from "lucide-react";

const GITHUB_REPO = "Raamgopal8/Successor";
const GITHUB_RELEASE_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export default function LandingPage() {
  const [versionData, setVersionData] = useState({
    version: "0.1.8",
    releaseDate: "Latest Build",
    releaseTag: "v0.1.8",
    platforms: {
      windows: {
        available: true,
        url: "/downloads/successor-latest-windows-x64.exe",
        filename: "Successor_0.1.8_x64-setup.exe",
        size: "~15 MB",
        source: "local",
      },
      "linux-deb": {
        available: true,
        url: "/downloads/successor-latest-linux.deb",
        filename: "successor_0.1.8_amd64.deb",
        size: "~12 MB",
        source: "local",
      },
    },
  });

  const [downloadingPlatform, setDownloadingPlatform] = useState(null); // 'windows' | 'linux-deb' | null
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [userOs, setUserOs] = useState("windows"); // 'windows' | 'linux'
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [gitHubFetched, setGitHubFetched] = useState(false);

  // Auto-detect visitor operating system
  useEffect(() => {
    if (typeof window !== "undefined" && navigator?.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("linux") && !ua.includes("android")) {
        setUserOs("linux");
      } else {
        setUserOs("windows");
      }
    }
  }, []);

  // Fetch latest release metadata from GitHub Actions Release API (with fallback to /version.json)
  useEffect(() => {
    async function fetchReleaseMetadata() {
      try {
        const ghRes = await fetch(GITHUB_RELEASE_API, {
          headers: { Accept: "application/vnd.github.v3+json" },
        });

        if (ghRes.ok) {
          const release = await ghRes.json();
          const assets = release.assets || [];

          // Find Windows (.exe or .msi) and Linux (.deb) assets
          const winAsset = assets.find(
            (a) => a.name.endsWith(".exe") || a.name.endsWith(".msi")
          );
          const debAsset = assets.find((a) => a.name.endsWith(".deb"));

          const formatSize = (bytes) => {
            if (!bytes) return null;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          };

          const releaseDateFormatted = release.published_at
            ? new Date(release.published_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Latest Build";

          setVersionData((prev) => ({
            version: release.tag_name?.replace(/^v/, "") || prev.version,
            releaseTag: release.tag_name || `v${prev.version}`,
            releaseDate: releaseDateFormatted,
            platforms: {
              windows: {
                available: true,
                url: winAsset?.browser_download_url || prev.platforms.windows.url,
                filename: winAsset?.name || prev.platforms.windows.filename,
                size: formatSize(winAsset?.size) || prev.platforms.windows.size,
                source: winAsset ? "github-actions" : "local",
              },
              "linux-deb": {
                available: true,
                url: debAsset?.browser_download_url || prev.platforms["linux-deb"].url,
                filename: debAsset?.name || prev.platforms["linux-deb"].filename,
                size: formatSize(debAsset?.size) || prev.platforms["linux-deb"].size,
                source: debAsset ? "github-actions" : "local",
              },
            },
          }));
          setGitHubFetched(true);
          return;
        }
      } catch (err) {
        console.warn("Server release fetch failed, using fallback /version.json:", err);
      }

      // Fallback: Read local /version.json
      try {
        const localRes = await fetch("/version.json", { cache: "no-store" });
        if (localRes.ok) {
          const data = await localRes.json();
          setVersionData((prev) => ({
            ...prev,
            version: data.version || prev.version,
            releaseTag: `v${data.version || prev.version}`,
            releaseDate: data.releaseDate || prev.releaseDate,
            platforms: {
              windows: {
                ...prev.platforms.windows,
                ...(data.platforms?.windows || {}),
              },
              "linux-deb": {
                ...prev.platforms["linux-deb"],
                ...(data.platforms?.["linux-deb"] || {}),
              },
            },
          }));
        }
      } catch (e) {
        // silent fallback to default initial state
      }
    }

    fetchReleaseMetadata();
  }, []);

  /**
   * Programmatic Direct File Download
   * Strictly avoids navigating or redirecting to github.com
   * Triggers the native browser download prompt seamlessly.
   */
  const handleDirectDownload = async (platformKey) => {
    setDownloadingPlatform(platformKey);
    setDownloadSuccess(null);

    let targetUrl = versionData.platforms?.[platformKey]?.url;
    let filename = versionData.platforms?.[platformKey]?.filename;

    try {
      // Refresh latest GitHub asset link dynamically on click
      const res = await fetch(GITHUB_RELEASE_API);
      if (res.ok) {
        const release = await res.json();
        const assets = release.assets || [];

        let matchedAsset = null;
        if (platformKey === "windows") {
          matchedAsset = assets.find((a) => a.name.endsWith(".exe") || a.name.endsWith(".msi"));
        } else if (platformKey === "linux-deb") {
          matchedAsset = assets.find((a) => a.name.endsWith(".deb"));
        }

        if (matchedAsset?.browser_download_url) {
          targetUrl = matchedAsset.browser_download_url;
          filename = matchedAsset.name;
        }
      }
    } catch (err) {
      console.warn("Dynamic refresh failed, using cached asset URL:", err);
    }

    // Trigger direct browser save prompt without leaving page
    try {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.setAttribute("download", filename || "Successor-Installer");
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccess(platformKey);
      setTimeout(() => {
        setDownloadingPlatform(null);
      }, 1000);
      setTimeout(() => {
        setDownloadSuccess(null);
      }, 5000);
    } catch (err) {
      console.error("Download trigger failed:", err);
      setDownloadingPlatform(null);
    }
  };

  const copyInstallCommand = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const currentVersionTag = versionData.releaseTag || `v${versionData.version}`;
  const winInfo = versionData.platforms?.windows || {};
  const debInfo = versionData.platforms?.["linux-deb"] || {};

  return (
    <div style={styles.container}>
      {/* Background Decorative Ambient Glows */}
      <div style={styles.bgGlowPurple} />
      <div style={styles.bgGlowCyan} />

      {/* Sticky Header */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoBadge}>S</div>
          <span style={styles.brandTitle}>Successor</span>
          <span style={styles.versionPill}>{currentVersionTag}</span>
          {gitHubFetched && (
            <span style={styles.ciPill}>
              <span style={styles.pulseDot} />
              Server
            </span>
          )}
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
            <ArrowRight size={14} style={{ marginLeft: 6 }} />
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.taglineBadge}>
          <Sparkles size={14} color="#c084fc" style={{ marginRight: 6 }} />
          <span>Next-Generation Productivity & Flow OS</span>
          <span style={styles.badgeSeparator}>•</span>
          <span style={{ color: "#38bdf8" }}>{versionData.releaseDate}</span>
        </div>

        <h1 style={styles.heroHeading}>
          Master Your Focus. <br />
          <span style={styles.gradientText}>Elevate Your Output.</span>
        </h1>

        <p style={styles.heroSubtext}>
          Successor is a native desktop application engineered with Tauri v2 and Rust
          to organize daily workplans, schedule tasks, and accelerate goals with AI.
        </p>

        {/* Primary Direct Download CTAs (No Redirect) */}
        <div style={styles.ctaGroup} id="downloads">
          {/* Windows Download Button */}
          <button
            type="button"
            onClick={() => handleDirectDownload("windows")}
            disabled={downloadingPlatform === "windows"}
            style={{
              ...styles.downloadButton,
              ...(userOs === "windows" ? styles.highlightedBtn : styles.standardBtn),
            }}
          >
            <div style={styles.btnIconWrap}>
              <Monitor size={22} color={userOs === "windows" ? "#ffffff" : "#38bdf8"} />
            </div>
            <div style={styles.buttonTextWrapper}>
              <div style={styles.btnActionRow}>
                <span style={styles.btnAction}>Download for Windows</span>
                <span style={styles.sizeBadge}>{winInfo.size || "~15 MB"}</span>
              </div>
              <span style={styles.btnMeta}>
                {downloadingPlatform === "windows"
                  ? "Connecting to Server..."
                  : downloadSuccess === "windows"
                  ? "✓ Download Started!"
                  : "64-bit Installer (.exe)"}
              </span>
            </div>
            <div style={styles.btnActionIcon}>
              {downloadingPlatform === "windows" ? (
                <RefreshCw size={18} style={styles.spinningIcon} />
              ) : downloadSuccess === "windows" ? (
                <CheckCircle2 size={18} color="#4ade80" />
              ) : (
                <Download size={18} />
              )}
            </div>
          </button>

          {/* Linux Debian (.deb) Download Button */}
          <button
            type="button"
            onClick={() => handleDirectDownload("linux-deb")}
            disabled={downloadingPlatform === "linux-deb"}
            style={{
              ...styles.downloadButton,
              ...(userOs === "linux" ? styles.highlightedBtn : styles.secondaryBtn),
            }}
          >
            <div style={styles.btnIconWrap}>
              <Terminal size={22} color={userOs === "linux" ? "#ffffff" : "#c084fc"} />
            </div>
            <div style={styles.buttonTextWrapper}>
              <div style={styles.btnActionRow}>
                <span style={styles.btnAction}>Download for Linux</span>
                <span style={styles.sizeBadge}>{debInfo.size || "~12 MB"}</span>
              </div>
              <span style={styles.btnMeta}>
                {downloadingPlatform === "linux-deb"
                  ? "Connecting to Server..."
                  : downloadSuccess === "linux-deb"
                  ? "✓ Download Started!"
                  : "Debian / Ubuntu Package (.deb)"}
              </span>
            </div>
            <div style={styles.btnActionIcon}>
              {downloadingPlatform === "linux-deb" ? (
                <RefreshCw size={18} style={styles.spinningIcon} />
              ) : downloadSuccess === "linux-deb" ? (
                <CheckCircle2 size={18} color="#4ade80" />
              ) : (
                <Download size={18} />
              )}
            </div>
          </button>
        </div>

        {/* Direct Download Assurance Note */}
        <div style={styles.directNoticeRow}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Direct instant download from Server. No redirects or external pages.</span>
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
              Successor includes native continuous updates via Tauri. Once installed, the
              desktop client checks for new releases and updates silently in the background.
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
              Built on Tauri v2 and Rust for an ultra-lightweight memory footprint and
              zero-latency launch times.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <Layers size={24} color="#8b5cf6" />
            </div>
            <h3 style={styles.featureTitle}>Unified Project Boards</h3>
            <p style={styles.featureDesc}>
              Track daily tasks, manage priority timelines, and navigate workflow
              stages seamlessly without clutter.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <Cpu size={24} color="#38bdf8" />
            </div>
            <h3 style={styles.featureTitle}>Gemini AI Strategic Logic</h3>
            <p style={styles.featureDesc}>
              Personalized 90-day roadmaps, tactical weekly planning, and RAG curriculum
              synthesis grounded in real roadmaps.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIconWrap}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <h3 style={styles.featureTitle}>Cloud Sync & Security</h3>
            <p style={styles.featureDesc}>
              Real-time synchronization powered by Firebase with authenticated
              multi-device access and automatic backup.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Instructions */}
      <section style={styles.instructionsSection} id="installation">
        <h2 style={styles.sectionHeading}>Installation Guide</h2>
        <div style={styles.installGrid}>
          {/* Windows Box */}
          <div style={styles.installBox}>
            <div style={styles.installHeaderRow}>
              <Monitor size={20} color="#38bdf8" />
              <h4 style={styles.installTitle}>Windows (.exe)</h4>
            </div>
            <ol style={styles.orderedList}>
              <li>Click <strong>Download for Windows</strong> above to start the direct download.</li>
              <li>Open the downloaded <code>{winInfo.filename || "Successor_Setup.exe"}</code> installer.</li>
              <li>Follow the installer prompt; Successor installs cleanly and launches automatically.</li>
            </ol>
          </div>

          {/* Linux Debian/Ubuntu Box */}
          <div style={styles.installBox}>
            <div style={styles.installHeaderRow}>
              <Terminal size={20} color="#c084fc" />
              <h4 style={styles.installTitle}>Linux Debian / Ubuntu (.deb)</h4>
            </div>
            <p style={styles.installHint}>
              Click <strong>Download for Linux</strong> above, then install via your package manager:
            </p>
            <div style={styles.codeSnippet}>
              <code>sudo dpkg -i {debInfo.filename || "successor_amd64.deb"}</code>
              <button
                type="button"
                onClick={() =>
                  copyInstallCommand(`sudo dpkg -i ${debInfo.filename || "successor_amd64.deb"}`)
                }
                style={styles.copyBtn}
                title="Copy terminal command"
              >
                {copiedSnippet ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </div>
            <p style={styles.installHintSub}>
              If any dependencies are missing, run <code>sudo apt-get install -f</code> to resolve automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerBrand}>
          <div style={styles.footerLogoBadge}>S</div>
          <span>Successor Desktop • Tauri v2, Rust &amp; Firebase</span>
        </div>
        <div style={styles.footerLinks}>
          <a href="/login" style={styles.footerLink}>
            Web App
          </a>
          <span style={{ color: "#334155" }}>•</span>
          <a href="/privacy" style={styles.footerLink}>
            Privacy Policy
          </a>
          <span style={{ color: "#334155" }}>•</span>
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
    backgroundColor: "#070b14",
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
    top: "-160px",
    left: "15%",
    width: "650px",
    height: "650px",
    background:
      "radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgGlowCyan: {
    position: "absolute",
    top: "-120px",
    right: "15%",
    width: "600px",
    height: "600px",
    background:
      "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 48px",
    zIndex: 10,
    borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
    backgroundColor: "rgba(7, 11, 20, 0.8)",
    backdropFilter: "blur(14px)",
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
    padding: "3px 9px",
    borderRadius: "9999px",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    fontWeight: 600,
    border: "1px solid rgba(168, 85, 247, 0.3)",
  },
  ciPill: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "9999px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
    fontWeight: 600,
    border: "1px solid rgba(16, 185, 129, 0.25)",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  pulseDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  navLink: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: 500,
    textDecoration: "none",
    transition: "color 0.2s",
  },
  appBtn: {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
    transition: "background-color 0.2s",
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
  badgeSeparator: {
    margin: "0 8px",
    opacity: 0.4,
  },
  heroHeading: {
    fontSize: "54px",
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
    maxWidth: "660px",
    marginBottom: "40px",
  },
  ctaGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "18px",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: "16px",
  },
  downloadButton: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 26px",
    borderRadius: "14px",
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 0.15s, box-shadow 0.15s, background-color 0.15s",
    minWidth: "280px",
  },
  highlightedBtn: {
    background: "linear-gradient(135deg, #9333ea 0%, #2563eb 100%)",
    color: "#ffffff",
    border: "none",
    boxShadow: "0 10px 25px -5px rgba(147, 51, 234, 0.5)",
  },
  standardBtn: {
    backgroundColor: "#131c2e",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    color: "#f8fafc",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.3)",
  },
  secondaryBtn: {
    backgroundColor: "#131c2e",
    border: "1px solid rgba(168, 85, 247, 0.3)",
    color: "#f8fafc",
    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.3)",
  },
  btnIconWrap: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  buttonTextWrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  btnActionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  btnAction: {
    fontWeight: 700,
    fontSize: "15px",
    lineHeight: 1.2,
  },
  sizeBadge: {
    fontSize: "11px",
    fontWeight: 600,
    padding: "1px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  btnMeta: {
    fontSize: "12px",
    opacity: 0.85,
    marginTop: "3px",
  },
  btnActionIcon: {
    flexShrink: 0,
    marginLeft: "4px",
  },
  spinningIcon: {
    animation: "spin 1s linear infinite",
  },
  directNoticeRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "36px",
  },
  updateCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "18px 24px",
    backgroundColor: "rgba(19, 28, 46, 0.65)",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    borderRadius: "16px",
    maxWidth: "700px",
    width: "100%",
    backdropFilter: "blur(12px)",
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
    maxWidth: "1100px",
    margin: "40px auto",
    padding: "0 24px",
    textAlign: "center",
    zIndex: 1,
  },
  sectionHeading: {
    fontSize: "32px",
    fontWeight: 700,
    color: "#f8fafc",
    marginBottom: "36px",
    letterSpacing: "-0.5px",
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "22px",
  },
  featureCard: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "30px 24px",
    textAlign: "left",
    transition: "border-color 0.2s",
  },
  featureIconWrap: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "18px",
  },
  featureTitle: {
    fontSize: "17px",
    fontWeight: 600,
    color: "#f8fafc",
    marginBottom: "10px",
  },
  featureDesc: {
    fontSize: "13.5px",
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
  },
  instructionsSection: {
    maxWidth: "920px",
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
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "16px",
    padding: "26px",
  },
  installHeaderRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "14px",
  },
  installTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#f1f5f9",
    margin: 0,
  },
  orderedList: {
    color: "#94a3b8",
    fontSize: "13.5px",
    lineHeight: 1.8,
    paddingLeft: "20px",
    margin: 0,
  },
  codeSnippet: {
    backgroundColor: "#020617",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#38bdf8",
    fontFamily: "monospace",
    fontSize: "12.5px",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copyBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    borderRadius: "6px",
  },
  installHint: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "0 0 10px",
    lineHeight: 1.5,
  },
  installHintSub: {
    fontSize: "12px",
    color: "#64748b",
    margin: "6px 0 0",
    lineHeight: 1.5,
  },
  footer: {
    borderTop: "1px solid rgba(255, 255, 255, 0.07)",
    padding: "28px 48px",
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
  footerBrand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#94a3b8",
  },
  footerLogoBadge: {
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    background: "linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)",
    color: "#ffffff",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
  },
  footerLinks: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  footerLink: {
    color: "#94a3b8",
    fontSize: "13px",
    textDecoration: "none",
  },
};
