import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New dark purple theme
        background: '#0a0118',
        'background-secondary': '#0f0522',
        surface: '#130826',
        card: 'rgba(255, 255, 255, 0.03)',
        'card-hover': 'rgba(255, 255, 255, 0.06)',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-light': 'rgba(255, 255, 255, 0.12)',

        // Primary gradient colors
        'primary-purple': '#7c3aed',
        'primary-pink': '#ec4899',
        'primary-violet': '#8b5cf6',

        // Dynamic theme colors (CSS variables)
        'primary-accent': 'var(--color-primary)',
        'secondary-accent': 'var(--color-secondary)',

        // Accent colors
        primary: '#7c3aed',
        secondary: '#ec4899',
        accent: '#a855f7',

        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',

        // Text colors
        'text-primary': '#ffffff',
        'text-secondary': '#a1a1aa',
        'text-muted': '#71717a',

        // Glass effect colors
        'glass-white': 'rgba(255, 255, 255, 0.05)',
        'glass-purple': 'rgba(124, 58, 237, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
        'gradient-pink': 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-glow': 'radial-gradient(circle at 50% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 50%)',
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(124, 58, 237, 0.3)',
        'glow-md': '0 0 30px rgba(124, 58, 237, 0.4)',
        'glow-lg': '0 0 50px rgba(124, 58, 237, 0.5)',
        'glow-pink': '0 0 30px rgba(236, 72, 153, 0.4)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideIn: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
