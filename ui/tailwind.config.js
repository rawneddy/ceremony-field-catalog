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
        ceremony: "#0052FF",
        steel: "#E2E8F0",
        slate: "#1E293B",
        mint: "#00F5D4",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
