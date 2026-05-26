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
        brand: {
          DEFAULT: "#76b900", // NVIDIA green
          dark: "#5a8c00",
        },
        surface: {
          DEFAULT: "#0f0f0f",
          raised: "#1a1a1a",
          border: "#2a2a2a",
          hover: "#252525",
        },
        text: {
          primary: "#f0f0f0",
          secondary: "#9a9a9a",
          muted: "#5a5a5a",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
