/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Warm near-black surfaces so the orange brand reads richer than on cool greys
        bg: {
          DEFAULT: "#0B0A09",
          surface: "#131110",
          raised: "#1A1714",
          overlay: "#211D19",
        },
        border: {
          DEFAULT: "#241F1B",
          subtle: "#1A1613",
          strong: "#382F28",
        },
        ink: {
          DEFAULT: "#FAFAFA",
          muted: "#A39B92",
          faint: "#857C72",
        },
        // Brand orange sampled from the logo gradient (#FD9C07 -> #FD6902 -> #FF5400)
        accent: {
          DEFAULT: "#FF6A00",
          dim: "#B34A00",
          bright: "#FF9A3D",
        },
        // "Live / in-progress" state: kept yellow so it never reads as brand orange
        live: {
          DEFAULT: "#FFC53D",
          dim: "#7A5A14",
        },
        success: { DEFAULT: "#4CB782", dim: "#1E3A2C" },
        danger: { DEFAULT: "#E5484D", dim: "#3A1F21" },
        info: { DEFAULT: "#5E9DD2", dim: "#1E2D3A" },
      },
      borderRadius: {
        sm: "5px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      keyframes: {
        "pulse-live": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "chunk-fail": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(229,72,77,0.55)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,106,0,0.35), 0 8px 30px -8px rgba(255,106,0,0.45)",
      },
      animation: {
        "pulse-live": "pulse-live 1.6s ease-in-out infinite",
        "chunk-fail": "chunk-fail 0.9s ease-in-out 2",
        "fade-up": "fade-up 0.4s ease-out",
        shimmer: "shimmer 2.5s linear infinite",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #FFA10A 0%, #FF6A00 55%, #FF4D00 100%)",
        "brand-glow":
          "radial-gradient(60% 50% at 50% 0%, rgba(255,106,0,0.16) 0%, rgba(255,106,0,0) 70%)",
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
