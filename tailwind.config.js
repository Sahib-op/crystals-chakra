/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chakra: {
          bg: '#0a0514',
          surface: '#150a21',
          ring: '#2a1b42',
          cyan: '#25A9BA',
          blue: '#14467D',
          gold: '#D4AF37',
          goldLight: '#F3E5AB',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        serif: [
          '"Playfair Display Variable"',
          '"Playfair Display"',
          'Georgia',
          'serif',
        ],
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.9' },
        },
        glowpulse: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.94)' },
          '50%': { opacity: '0.65', transform: 'scale(1.06)' },
        },
        align: {
          '0%, 100%': { opacity: '0', transform: 'scale(0.7)' },
          '45%, 55%': { opacity: '0.2', transform: 'scale(1.2)' },
        },
        'glow-line-pulse': {
          '0%, 100%': { opacity: '0.3', strokeWidth: '1.5' },
          '50%': { opacity: '0.7', strokeWidth: '2.5' },
        },
        'star-drift': {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
          '100%': { transform: 'translateY(0)' },
        },
        'logo-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(4px) rotate(-0.5deg)' },
        },
      },
      animation: {
        twinkle: 'twinkle 4s ease-in-out infinite',
        'glow-pulse': 'glowpulse 7s ease-in-out infinite',
        align: 'align 6s ease-in-out infinite',
        'glow-line-pulse': 'glow-line-pulse 4s ease-in-out infinite',
        'star-drift': 'star-drift 8s ease-in-out infinite',
        'logo-float': 'logo-float 10s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
