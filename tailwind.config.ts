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
          DEFAULT: "#4DE2FF",
          soft: "#9FF0FF",
          deep: "#1EA6C7",
        },
        ember: {
          DEFAULT: "#FF7A2F",
          soft: "#FFA463",
          deep: "#E0551C",
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
        mist: "0 0 0 1px rgba(77,226,255,0.22), 0 16px 48px -14px rgba(77,226,255,0.40)",
        ember: "0 0 0 1px rgba(255,122,47,0.30), 0 16px 40px -12px rgba(255,122,47,0.48)",
        lift: "0 24px 60px -20px rgba(0,0,0,0.75), 0 2px 0 0 rgba(255,255,255,0.04) inset",
      },
      backgroundImage: {
        "vapor-fade":
          "linear-gradient(90deg, transparent 0%, rgba(77,226,255,0.45) 50%, transparent 100%)",
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
        sheen: {
          "0%": { transform: "translateX(-120%) skewX(-18deg)" },
          "100%": { transform: "translateX(220%) skewX(-18deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        drift: "drift 14s ease-in-out infinite",
        "drift-slow": "drift 22s ease-in-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        sheen: "sheen 1.1s ease-out",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
