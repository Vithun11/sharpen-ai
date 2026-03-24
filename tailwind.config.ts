import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', "'Courier New'", 'monospace'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
        wordmark: ['var(--font-wordmark)', 'sans-serif'],
      },
      colors: {
        bg:           '#F0FAFA',
        surface:      '#FFFFFF',
        border:       '#D6EEEE',
        primary:      '#1A1A1A',
        muted:        '#6B6B6B',
        accent:       '#1F8F8A',
        'accent-light': '#E6F7F7',
        error:        '#D4607E',
        warning:      '#B88500',
        success:      '#4AAA00',
      },
      borderRadius: {
        card:  '8px',
        input: '6px',
        badge: '4px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
      transitionDuration: {
        hover:  '150',
        panel:  '200',
      },
    },
  },
  plugins: [],
}

export default config
