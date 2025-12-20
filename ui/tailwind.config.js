/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F8FAFC",
        ink: "#0F172A",
        ceremony: {
          DEFAULT: "#0052FF",
          hover: "#0043CC",
        },
        steel: "#E2E8F0",
        charcoal: "#1E293B",
        mint: "#00F5D4",
        error: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        success: {
          DEFAULT: "#10B981",
          700: "#047857",
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'header': '0 8px 24px -4px rgba(15, 23, 42, 0.3)', // ink color at 30%
      },
    },
  },
  plugins: [],
}
