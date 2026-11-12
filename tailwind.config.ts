import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D9480F',
        'primary-dark': '#B33C0B',
        bg: '#FFF9F2',
        surface: '#FFFFFF',
        border: '#E9DFD3',
        text: '#1F2937',
        muted: '#6B7280',
        success: '#2F9E44',
        warning: '#F59F00',
        danger: '#E03131',
        info: '#1971C2',
        neutral: '#868E96',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

