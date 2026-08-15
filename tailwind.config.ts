import type { Config } from "tailwindcss";

// 名片王 Pro design system tokens (來自 ui-ux-pro-max MASTER.md)
// Design dials: Variance 4/10 | Motion 3/10 | Density 6/10
// Style: Glassmorphism | Pattern: Product Demo + Features
//
// Color roles per MASTER.md:
//   Primary  = Trust blue   #1E40AF
//   Secondary = Sky blue    #3B82F6
//   Accent    = Profit green #059669  (CTA)
//   Background = #0F172A (dark default) | #FFFFFF (light)
//   Foreground = white       | slate-900
//   Card     = #192134       | white
//   Muted    = #101A34       | slate-50
//   Border   = rgba white 0.08 | slate-200
//   Destructive = #DC2626
//   Ring     = white         | brand-600

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 取代舊 brand-* (sky-600)
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#1E40AF", // primary
          700: "#1E3A8A",
          900: "#172554",
        },
        accent: {
          500: "#10B981",
          600: "#059669", // CTA
          700: "#047857",
        },
        surface: {
          dark: "#0F172A", // bg
          card: "#192134", // card
          muted: "#101A34", // muted
        },
        danger: {
          500: "#EF4444",
          600: "#DC2626",
        },
      },
      fontFamily: {
        // Caveat + Quicksand 由 next/font/google 提供 CSS variables
        heading: ["var(--font-caveat)", "cursive"],
        body: ["var(--font-quicksand)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // 強制 base 16px / line-height 1.5 (MASTER.md typography rule)
        base: ["1rem", { lineHeight: "1.5" }],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        // MASTER.md Shadow Depths
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        xl: "0 20px 25px rgba(0,0,0,0.15)",
        glass: "0 8px 32px rgba(0,0,0,0.18)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;