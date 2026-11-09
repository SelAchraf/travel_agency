import type { Config } from "tailwindcss";

const config: Config = {
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
          900: "#0D233A",
          950: "#071524",
        },
        terracotta: {
          500: "#C85A32",
          600: "#A84520",
        },
        saffron: {
          500: "#E09F3E",
        },
        mint: {
          500: "#2A9D8F",
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
