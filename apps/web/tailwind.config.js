/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B',
        panel: '#111113',
        card: '#18181B',
        border: '#27272A',
        primary: {
          DEFAULT: '#FAFAFA',
          foreground: '#09090B',
        },
        secondary: {
          DEFAULT: '#A1A1AA',
          foreground: '#09090B',
        },
        muted: {
          DEFAULT: '#71717A',
          foreground: '#FAFAFA',
        },
        accent: {
          DEFAULT: '#8B5CF6',
          foreground: '#FAFAFA',
        },
        success: {
          DEFAULT: '#22C55E',
          foreground: '#FAFAFA',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FAFAFA',
        },
        error: {
          DEFAULT: '#F43F5E',
          foreground: '#FAFAFA',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
