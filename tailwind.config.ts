import type { Config } from "tailwindcss";

// 名片王 Pro design system v2 — CRM-specific
// Re-searched with ui-ux-pro-max query "CRM contact management dashboard
// table list density" + competitor audit (Attio / Clay / folk / Monica).
//
// Design dials: Variance 3/10 (Centered/Minimal) | Motion 2/10 (Subtle)
//   | Density 8/10 (Dense/Dashboard)
// Style: Minimalism & Swiss (clean, spacious, functional, sans-serif, grid)
// Pattern: Product Demo + Features
//
// Typography OVERRIDE: MASTER.md suggested Cormorant Garamond (academic);
//   for a B2B CRM we use Inter (UI) + JetBrains Mono (numeric IDs).
//   This is the industry standard (Linear, Notion, Attio, Vercel all use Inter).
//
// Color roles (MASTER.md v2):
//   Primary       = #2563EB (Professional blue)
//   Secondary     = #3B82F6
//   Accent/CTA    = #059669 (Deal green)
//   Background    = #F8FAFC (light, slate-50 — DEFAULT)
//   Foreground    = #0F172A (slate-900)
//   Card          = #FFFFFF
//   Muted         = #F1F5FD
//   Border        = #E4ECFC
//   Destructive  = #DC2626
//   Ring          = #2563EB
//
// Dark mode (secondary):
//   Background    = #0F172A
//   Card          = #1E293B (slate-800)
//   Border        = #334155 (slate-700)
//   Foreground    = #F1F5F9 (slate-100)

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand: #2563EB (professional blue)
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          500: "#3B82F6",
          600: "#2563EB", // PRIMARY
          700: "#1D4ED8",
          900: "#1E3A8A",
        },
        // Accent: deal-green for CTA (per MASTER.md)
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          500: "#10B981",
          600: "#059669", // CTA
          700: "#047857",
        },
        // Destructive (errors)
        danger: {
          500: "#EF4444",
          600: "#DC2626",
        },
        // Surfaces for dark mode (CRM night shift use)
        surface: {
          dark: "#0F172A",
          card: "#1E293B",
          muted: "#334155",
        },
      },
      fontFamily: {
        // Inter (UI) + JetBrains Mono (numeric IDs / hashes) — industry CRM standard
        sans: [
          "var(--font-inter)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        base: ["1rem", { lineHeight: "1.5" }],
        xs: ["0.75rem", { lineHeight: "1.5" }],
      },
      borderRadius: {
        // MASTER.md spacing density 8/10 = tighter
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15,23,42,0.04)",
        DEFAULT: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        md: "0 4px 6px rgba(15,23,42,0.07), 0 2px 4px rgba(15,23,42,0.04)",
        lg: "0 10px 15px rgba(15,23,42,0.1)",
      },
    },
  },
  plugins: [],
};

export default config;