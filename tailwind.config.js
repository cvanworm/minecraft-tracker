/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mc: {
          dirt: '#16110d',
          stone: '#383838',
          deepslate: '#1b1b22',
          slot: '#8b8b8b',
          darkslot: '#121216',
          green: '#55ff55',
          darkgreen: '#00aa00',
          xp: '#7cfc00',
          gold: '#ffaa00',
          aqua: '#55ffff',
          yellow: '#ffff55',
          purple: '#ff55ff',
          red: '#ff5555',
          borderDark: '#101010',
          borderLight: '#ffffff',
          borderMid: '#555555',
        }
      },
      fontFamily: {
        minecraft: ['"Press Start 2P"', 'monospace'],
        pixel: ['"Silkscreen"', '"Press Start 2P"', 'monospace'],
        retro: ['"VT323"', 'monospace'],
        sans: ['"Silkscreen"', 'monospace', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
