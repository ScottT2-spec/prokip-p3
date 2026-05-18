import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        prokip: {
          navy: "#1B2B4B",
          "navy-dark": "#0F1C32",
          gold: "#F5B731",
          "gold-light": "#FEF3C7",
        },
        grade: {
          platinum: "#E5E4E2",
          green: "#28a745",
          blue: "#007bff",
          yellow: "#ffc107",
          red: "#dc3545",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        modal: "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 4px 6px rgba(0, 0, 0, 0.07)",
        modal: "0 25px 50px rgba(0, 0, 0, 0.15)",
      },
    },
  },
  plugins: [],
};
export default config;
