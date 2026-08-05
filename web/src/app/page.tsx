import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TokenShift — Design System Dashboard",
  description: "Live preview of your Figma design tokens compiled to CSS variables and Tailwind utility classes.",
};

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface TokenCardProps {
  name: string;
  value: string;
  cssVar: string;
  type?: "color" | "spacing" | "radius";
}

interface BadgeProps {
  label: string;
  variant: "success" | "warning" | "error" | "info" | "brand" | "neutral";
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ColorSwatch({ name, value, cssVar }: TokenCardProps) {
  return (
    <div className="group flex items-center gap-3 p-3 rounded-token-lg border border-surface-border bg-surface-card hover:bg-surface-card-hover transition-all duration-200 hover:border-brand-primary/30 cursor-default">
      <div
        className="w-10 h-10 rounded-token-md shrink-0 ring-2 ring-white/5 group-hover:ring-brand-primary/20 transition-all duration-200"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <div className="min-w-0">
        <p className="text-token-label text-neutral-100 truncate">{name}</p>
        <p className="text-token-caption text-neutral-500 font-mono truncate">{value}</p>
      </div>
    </div>
  );
}

function Badge({ label, variant }: BadgeProps) {
  const variantStyles: Record<BadgeProps["variant"], string> = {
    success: "bg-semantic-success/10 text-semantic-success border-semantic-success/20",
    warning: "bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20",
    error:   "bg-semantic-error/10   text-semantic-error   border-semantic-error/20",
    info:    "bg-semantic-info/10    text-semantic-info    border-semantic-info/20",
    brand:   "bg-brand-primary/10   text-brand-primary    border-brand-primary/20",
    neutral: "bg-neutral-800        text-neutral-300      border-surface-border",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-token-full text-token-caption font-medium border ${variantStyles[variant]}`}
    >
      {variant === "success" && <span className="w-1.5 h-1.5 rounded-full bg-semantic-success inline-block" />}
      {variant === "error"   && <span className="w-1.5 h-1.5 rounded-full bg-semantic-error   inline-block" />}
      {variant === "warning" && <span className="w-1.5 h-1.5 rounded-full bg-semantic-warning inline-block" />}
      {variant === "info"    && <span className="w-1.5 h-1.5 rounded-full bg-semantic-info    inline-block" />}
      {label}
    </span>
  );
}

function StatCard({
  value,
  label,
  icon,
  delay,
}: {
  value: string;
  label: string;
  icon: string;
  delay: string;
}) {
  return (
    <div
      className="glass rounded-token-xl p-6 text-center"
      style={{ animationDelay: delay }}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-token-h2 gradient-text">{value}</div>
      <div className="text-token-caption text-neutral-400 mt-1">{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const colorTokens: TokenCardProps[] = [
    { name: "Brand Primary",       value: "#6470f3", cssVar: "--color-brand-primary",       type: "color" },
    { name: "Brand Secondary",     value: "#7c3aed", cssVar: "--color-brand-secondary",     type: "color" },
    { name: "Brand Accent",        value: "#06b6d4", cssVar: "--color-brand-accent",        type: "color" },
    { name: "Surface Background",  value: "#0f172a", cssVar: "--color-surface-background",  type: "color" },
    { name: "Surface Card",        value: "#1e293b", cssVar: "--color-surface-card",        type: "color" },
    { name: "Success",             value: "#10b981", cssVar: "--color-semantic-success",    type: "color" },
    { name: "Warning",             value: "#f59e0b", cssVar: "--color-semantic-warning",    type: "color" },
    { name: "Error",               value: "#ef4444", cssVar: "--color-semantic-error",      type: "color" },
    { name: "Neutral 400",         value: "#94a3b8", cssVar: "--color-neutral-400",         type: "color" },
    { name: "Neutral 700",         value: "#334155", cssVar: "--color-neutral-700",         type: "color" },
    { name: "Primary Light",       value: "#e0e9ff", cssVar: "--color-brand-primary-light", type: "color" },
    { name: "Surface Border",      value: "#334155", cssVar: "--color-surface-border",      type: "color" },
  ];

  return (
    <div className="min-h-screen bg-surface-bg font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-surface-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-token-md flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))" }}
            >
              TS
            </div>
            <span className="text-token-label text-neutral-100 font-semibold">TokenShift</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge label="v1.0.0" variant="brand" />
            <Badge label="Live Tokens" variant="success" />
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow orbs */}
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--color-brand-primary), transparent)" }}
        />
        <div
          className="absolute top-20 right-1/4 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--color-brand-secondary), transparent)" }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64 opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse, var(--color-brand-accent), transparent)" }}
        />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-token-full border border-brand-primary/30 bg-brand-primary/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse inline-block" />
            <span className="text-token-caption text-brand-primary font-medium">Figma → GitHub → CSS · Zero Cost</span>
          </div>

          {/* Headline */}
          <h1 className="text-token-display gradient-text mb-6">
            Design Tokens,<br />
            <span className="text-neutral-100">Zero Friction</span>
          </h1>

          {/* Subtitle */}
          <p className="text-token-body text-neutral-400 max-w-2xl mx-auto mb-10">
            TokenShift extracts your Figma variables in one click, pushes them to GitHub as W3C design tokens,
            and compiles them to CSS custom properties — so your design system stays perfectly in sync.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              id="hero-cta-primary"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-token-lg font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-2xl"
              style={{
                background: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Install Figma Plugin
            </button>
            <a
              id="hero-cta-secondary"
              href="https://github.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-token-lg font-semibold border border-surface-border text-neutral-200 hover:border-brand-primary/50 hover:text-brand-primary transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Row ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard value="3"    label="Clicks to sync"    icon="🖱️"  delay="0ms" />
          <StatCard value="∞"    label="Token types"        icon="🎨"  delay="100ms" />
          <StatCard value="100%" label="W3C compliant"      icon="✅"  delay="200ms" />
          <StatCard value="$0"   label="Forever free"       icon="💸"  delay="300ms" />
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-token-h2 text-neutral-100 mb-3">How It Works</h2>
          <p className="text-token-body text-neutral-500">Three steps. Zero friction.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Extract from Figma",
              desc: "The plugin reads all local variables (colors, numbers, strings) and text styles from your Figma file — supporting W3C Design Token format natively.",
              icon: "🎨",
              gradient: "from-brand-primary/20 to-brand-secondary/20",
            },
            {
              step: "02",
              title: "Sync to GitHub",
              desc: "TokenShift creates a new branch, commits your tokens.json, and opens a Pull Request automatically — complete with a rich description of what changed.",
              icon: "⬆️",
              gradient: "from-brand-secondary/20 to-brand-accent/20",
            },
            {
              step: "03",
              title: "Compile to CSS",
              desc: "The GitHub Action triggers on merge, runs build-tokens.js, and commits the compiled tokens.css with CSS custom properties back to your repo.",
              icon: "⚡",
              gradient: "from-brand-accent/20 to-brand-primary/20",
            },
          ].map((item) => (
            <div
              key={item.step}
              id={`step-card-${item.step}`}
              className={`glass rounded-token-xl p-6 bg-gradient-to-br ${item.gradient} group hover:scale-[1.02] transition-all duration-300`}
            >
              <div className="flex items-start gap-4 mb-4">
                <span className="text-3xl">{item.icon}</span>
                <span
                  className="text-token-caption font-bold tracking-widest text-neutral-500"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  STEP {item.step}
                </span>
              </div>
              <h3 className="text-token-h3 text-neutral-100 mb-2">{item.title}</h3>
              <p className="text-token-body text-neutral-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Color Tokens Section ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-token-h2 text-neutral-100">Color Tokens</h2>
            <p className="text-token-body text-neutral-500 mt-1">
              Generated from Figma variables → CSS custom properties
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge label="12 tokens" variant="brand" />
            <Badge label="Synced" variant="success" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {colorTokens.map((token) => (
            <ColorSwatch key={token.cssVar} {...token} />
          ))}
        </div>
      </section>

      {/* ── Typography Tokens Section ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <h2 className="text-token-h2 text-neutral-100 mb-1">Typography Scale</h2>
          <p className="text-token-body text-neutral-500">
            Text styles extracted from Figma → compiled to CSS utilities
          </p>
        </div>
        <div className="glass rounded-token-xl divide-y divide-surface-border overflow-hidden">
          {[
            { cls: "text-token-display", label: "Display",  desc: "56px · 700 · −1.5px",  sample: "The quick brown fox" },
            { cls: "text-token-h1",      label: "H1",        desc: "36px · 700 · −0.5px",  sample: "Heading One" },
            { cls: "text-token-h2",      label: "H2",        desc: "28px · 600 · −0.3px",  sample: "Heading Two" },
            { cls: "text-token-h3",      label: "H3",        desc: "20px · 600 · 0px",     sample: "Heading Three" },
            { cls: "text-token-body",    label: "Body",      desc: "16px · 400 · 0px",     sample: "Body text — clear, readable, and perfectly spaced" },
            { cls: "text-token-label",   label: "Label",     desc: "14px · 500 · 0.1px",   sample: "Label Text" },
            { cls: "text-token-caption", label: "Caption",   desc: "12px · 400 · 0.2px",   sample: "Caption and small helper text" },
            { cls: "text-token-code",    label: "Code",      desc: "14px · 400 · 0px",     sample: "--color-brand-primary: #6470f3;" },
          ].map((item) => (
            <div
              key={item.cls}
              id={`typo-${item.label.toLowerCase()}`}
              className="flex items-center gap-6 px-6 py-4 hover:bg-surface-card-hover transition-colors duration-150"
            >
              <div className="w-20 shrink-0">
                <Badge label={item.label} variant="neutral" />
              </div>
              <div className="w-40 shrink-0">
                <code className="text-token-caption text-neutral-500 font-mono">{item.desc}</code>
              </div>
              <div
                className={`${item.cls} text-neutral-100 flex-1 min-w-0 truncate ${item.cls === "text-token-code" ? "font-mono text-brand-primary" : ""}`}
              >
                {item.sample}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Component Showcase ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <h2 className="text-token-h2 text-neutral-100 mb-1">Component Showcase</h2>
          <p className="text-token-body text-neutral-500">
            Buttons, badges, and cards — all powered by your design tokens
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Buttons card */}
          <div className="glass rounded-token-xl p-6" id="buttons-card">
            <h3 className="text-token-h3 text-neutral-100 mb-5">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <button
                id="btn-primary"
                className="px-5 py-2.5 rounded-token-lg text-token-label font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg"
                style={{ background: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))" }}
              >
                Primary
              </button>
              <button
                id="btn-secondary"
                className="px-5 py-2.5 rounded-token-lg text-token-label font-semibold border border-brand-primary text-brand-primary hover:bg-brand-primary/10 transition-all duration-200 hover:scale-105"
              >
                Secondary
              </button>
              <button
                id="btn-ghost"
                className="px-5 py-2.5 rounded-token-lg text-token-label font-semibold text-neutral-400 hover:text-neutral-100 hover:bg-surface-card-hover transition-all duration-200"
              >
                Ghost
              </button>
              <button
                id="btn-danger"
                className="px-5 py-2.5 rounded-token-lg text-token-label font-semibold bg-semantic-error/10 text-semantic-error border border-semantic-error/20 hover:bg-semantic-error/20 transition-all duration-200 hover:scale-105"
              >
                Danger
              </button>
              <button
                id="btn-accent"
                className="px-5 py-2.5 rounded-token-lg text-token-label font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20 transition-all duration-200 hover:scale-105"
              >
                Accent
              </button>
            </div>
          </div>

          {/* Badges card */}
          <div className="glass rounded-token-xl p-6" id="badges-card">
            <h3 className="text-token-h3 text-neutral-100 mb-5">Status Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge label="Success"     variant="success" />
              <Badge label="Warning"     variant="warning" />
              <Badge label="Error"       variant="error" />
              <Badge label="Info"        variant="info" />
              <Badge label="Brand"       variant="brand" />
              <Badge label="Neutral"     variant="neutral" />
              <Badge label="Synced ✓"   variant="success" />
              <Badge label="Draft"       variant="neutral" />
              <Badge label="Deprecated" variant="warning" />
              <Badge label="Breaking"   variant="error" />
            </div>
          </div>

          {/* Spacing tokens card */}
          <div className="glass rounded-token-xl p-6" id="spacing-card">
            <h3 className="text-token-h3 text-neutral-100 mb-5">Spacing Scale</h3>
            <div className="space-y-2">
              {[
                { label: "--spacing-1", size: "4px",   w: "w-1"  },
                { label: "--spacing-2", size: "8px",   w: "w-2"  },
                { label: "--spacing-4", size: "16px",  w: "w-4"  },
                { label: "--spacing-6", size: "24px",  w: "w-6"  },
                { label: "--spacing-8", size: "32px",  w: "w-8"  },
                { label: "--spacing-12",size: "48px",  w: "w-12" },
                { label: "--spacing-16",size: "64px",  w: "w-16" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <code className="text-token-caption font-mono text-neutral-500 w-36 shrink-0">{s.label}</code>
                  <div
                    className="h-4 rounded-token-sm"
                    style={{
                      width: s.size,
                      background: "linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-accent))",
                    }}
                  />
                  <span className="text-token-caption text-neutral-500">{s.size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Token JSON preview card */}
          <div className="glass rounded-token-xl p-6 overflow-hidden" id="json-preview-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-token-h3 text-neutral-100">Token JSON Preview</h3>
              <Badge label="W3C Format" variant="brand" />
            </div>
            <div className="rounded-token-lg bg-neutral-900/80 p-4 overflow-auto max-h-52 border border-surface-border">
              <pre className="text-token-code text-green-400 text-xs leading-relaxed">
{`{
  "color": {
    "brand": {
      "primary": {
        "$value": "#6470f3",
        "$type": "color",
        "$description": "Primary brand color"
      },
      "secondary": {
        "$value": "#7c3aed",
        "$type": "color"
      }
    }
  },
  "typography": {
    "h1": {
      "font-size": {
        "$value": "36px",
        "$type": "fontSize"
      },
      "font-weight": {
        "$value": "700",
        "$type": "fontWeight"
      }
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div
          className="relative overflow-hidden rounded-token-2xl p-12 text-center"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-primary-dark), var(--color-brand-primary), var(--color-brand-secondary))",
            backgroundSize: "300% 300%",
            animation: "gradient-shift 6s ease infinite",
          }}
        >
          {/* Noise texture overlay */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")"
          }} />

          <div className="relative">
            <h2 className="text-token-h1 text-white mb-4">
              Start syncing your tokens today
            </h2>
            <p className="text-token-body text-white/80 max-w-xl mx-auto mb-8">
              No backend. No subscription. Just install the Figma plugin, enter your GitHub PAT, and hit sync.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                id="cta-install"
                className="px-8 py-3 rounded-token-lg font-semibold bg-white text-brand-primary hover:bg-brand-primary-light transition-all duration-200 hover:scale-105 active:scale-95 shadow-xl"
              >
                Install Plugin — Free
              </button>
              <a
                id="cta-docs"
                href="#"
                className="px-8 py-3 rounded-token-lg font-semibold border-2 border-white/40 text-white hover:bg-white/10 transition-all duration-200 hover:scale-105"
              >
                Read the Docs
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-surface-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
              style={{ background: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))" }}
            >
              TS
            </div>
            <span className="text-token-label text-neutral-500">TokenShift · Open Source · MIT License</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-token-caption text-neutral-600 hover:text-neutral-400 transition-colors">Plugin</a>
            <a href="#" className="text-token-caption text-neutral-600 hover:text-neutral-400 transition-colors">Docs</a>
            <a href="#" className="text-token-caption text-neutral-600 hover:text-neutral-400 transition-colors">GitHub</a>
            <a href="#" className="text-token-caption text-neutral-600 hover:text-neutral-400 transition-colors">Changelog</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
