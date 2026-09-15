import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces — deep blue-slate void, not pure black
        void: "#0A0C10",
        surface: "#14171D",
        raised: "#1B1F27",
        line: "#262B34",
        // Text
        ink: "#EDF1F4",
        mute: "#8A93A3",
        faint: "#565D6B",
        // Brand — "vapor" cool mist (primary) + "ember" warm coil glow (CTA/accent)
        mist: {
          DEFAULT: "#7FD9F0",
          soft: "#B6ECFA",
          deep: "#3FA8C2",
        },
        ember: {
          DEFAULT: "#FF6B3D",
          soft: "#FF9770",
          deep: "#D6502A",
        },
        ok: "#6FE3B0",
        warn: "#F2C14E",
        bad: "#F0656B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1.1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        mist: "0 0 0 1px rgba(127,217,240,0.15), 0 12px 40px -12px rgba(127,217,240,0.25)",
        ember: "0 0 0 1px rgba(255,107,61,0.25), 0 12px 32px -10px rgba(255,107,61,0.35)",
      },
      backgroundImage: {
        "vapor-fade":
          "linear-gradient(90deg, transparent 0%, rgba(127,217,240,0.35) 50%, transparent 100%)",
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(2%, -3%) scale(1.05)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        drift: "drift 14s ease-in-out infinite",
        "drift-slow": "drift 22s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
