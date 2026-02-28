import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316", // primary orange
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        yes: "#22c55e", // swipe right — green
        no: "#ef4444", // swipe left  — red
      },
      fontFamily: {
        display: ['"Nunito"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 40px rgba(0,0,0,0.18)",
        "card-hover": "0 16px 60px rgba(0,0,0,0.28)",
      },
      borderRadius: {
        card: "1.5rem",
      },
      animation: {
        "bounce-in": "bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "slide-up": "slideUp 0.3s ease-out",
        confetti: "spin 1s linear infinite",
      },
      keyframes: {
        bounceIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(24px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
