import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC',
          light: '#4D94D9',
          dark: '#004C99',
        },
        secondary: {
          DEFAULT: '#003D7A',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        background: {
          DEFAULT: '#F5F7FA',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'heading': ['20px', { lineHeight: '150%', fontWeight: '400' }],
        'subheading': ['18px', { lineHeight: '150%', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
}
export default config
