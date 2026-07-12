import type { Config } from 'tailwindcss'

const config: Config = {
  // The app ships light-only. 'class' (with no .dark ever set) disarms the
  // stray dark: variants left in a few reading components so OS-dark students
  // no longer get mismatched dark islands inside a light UI.
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body: Atkinson Hyperlegible — designed by the Braille Institute for
        // maximum character disambiguation (b/d/p/q), chosen for young and
        // striving readers. Display: Baloo 2 — chunky, rounded, friendly.
        sans: ['var(--font-body)', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Soft, slightly indigo-tinted card shadow — friendlier than gray.
        card: '0 1px 2px rgb(49 46 129 / 0.06), 0 10px 24px -14px rgb(49 46 129 / 0.25)',
        'card-hover': '0 2px 4px rgb(49 46 129 / 0.08), 0 16px 32px -14px rgb(49 46 129 / 0.35)',
      },
      backgroundImage: {
        // Subtle dot grid for page backdrops (pair with bg-[length:26px_26px]).
        dots: 'radial-gradient(circle, rgb(99 102 241 / 0.10) 1.5px, transparent 1.5px)',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-2rem) rotate(0deg)', opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { transform: 'translateY(22rem) rotate(600deg)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        wiggle: 'wiggle 0.4s ease-in-out',
        'bounce-soft': 'bounce-soft 1.2s ease-in-out infinite',
        float: 'float 3.5s ease-in-out infinite',
        'confetti-fall': 'confetti-fall 2.6s ease-in forwards',
      },
    },
  },
  plugins: [],
}

export default config
