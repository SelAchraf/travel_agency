import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FAF8F5",
          100: "#F3EFEA",
          200: "#E6DFD5",
          300: "#D5C8B8",
          400: "#BFAD97",
          500: "#A6927B",
        },
        indigo: {
          800: "#133352",
          900: "#0D233A", // Mediterranean Night Indigo
          950: "#071524", // Deep Ink
        },
        terracotta: {
          400: "#DC734D",
          500: "#C85A32", // Tassili Ochre / Terracotta
          600: "#A84520",
          700: "#863415",
        },
        saffron: {
          400: "#ECB159",
          500: "#E09F3E", // Desert Saffron / Sunset Accent
          600: "#C68528",
        },
        mint: {
          500: "#2A9D8F", // Tipaza Coastal Highlight / Oasis Mint
          600: "#218276",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        arabic: ["'Readex Pro'", "'IBM Plex Sans Arabic'", "system-ui", "sans-serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
