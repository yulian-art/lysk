/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        pink: '#ffb7c5',
        gold: '#d4a574',
        'deep-blue': '#0a0e1a',
        aqua: '#78d6d0',
        pearl: '#fff7fb',
        coral: '#C85040',
        'coral-deep': '#C05040',
        'qiyu-pearl': '#F0D5C0'
      },
      fontFamily: {
        serif: ['Noto Serif SC', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['SFMono-Regular', 'Consolas', 'Liberation Mono', 'monospace']
      },
      keyframes: {
        'hint-breathe': {
          '0%, 100%': {
            opacity: '0.58',
            textShadow: '0 0 14px rgba(255, 183, 197, 0.36)',
            transform: 'translateX(-50%) translateY(0)'
          },
          '50%': {
            opacity: '1',
            textShadow: '0 0 22px rgba(255, 183, 197, 0.7), 0 0 34px rgba(212, 165, 116, 0.28)',
            transform: 'translateX(-50%) translateY(-4px)'
          }
        },
        'footer-petal': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.72' },
          '50%': { transform: 'translateY(-6px) rotate(16deg)', opacity: '1' }
        },
        ripple: {
          from: { opacity: '0.92', transform: 'translate(-50%, -50%) scale(0.2)' },
          to: { opacity: '0', transform: 'translate(-50%, -50%) scale(10)' }
        },
        'water-rise': {
          '0%': { transform: 'translateY(100%)' },
          '50%, 100%': { transform: 'translateY(0)' }
        },
        'avatar-dissolve': {
          '0%': {
            opacity: '1',
            maskImage: 'radial-gradient(circle, #000 70%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle, #000 70%, transparent 72%)'
          },
          '50%': {
            opacity: '0.72',
            maskImage: 'radial-gradient(circle, #000 36%, transparent 40%)',
            WebkitMaskImage: 'radial-gradient(circle, #000 36%, transparent 40%)'
          },
          '100%': {
            opacity: '0',
            maskImage: 'radial-gradient(circle, #000 0%, transparent 12%)',
            WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 12%)'
          }
        },
        'glass-dissolve': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'opening-fade': {
          '0%, 66%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        'wallpaper-pop': {
          '0%': { opacity: '0.3', transform: 'translateX(-30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'music-pop': {
          '0%': { transform: 'translateY(20px)' },
          '100%': { transform: 'translateY(0)' }
        },
        'frame-shake': {
          '0%': { transform: 'rotate(0deg) translateX(0)' },
          '20%': { transform: 'rotate(3deg) translateX(4px)' },
          '40%': { transform: 'rotate(-4deg) translateX(-5px)' },
          '60%': { transform: 'rotate(2deg) translateX(3px)' },
          '100%': { transform: 'rotate(0deg) translateX(0)' }
        },
        'spa-leave': {
          to: { opacity: '0', transform: 'translateY(-28px)' }
        },
        'spa-enter': {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'hint-breathe': 'hint-breathe 2.4s ease-in-out infinite',
        'footer-petal': 'footer-petal 3.6s ease-in-out infinite',
        ripple: 'ripple 780ms ease-out forwards',
        'water-rise': 'water-rise 1.2s ease-in-out forwards',
        'avatar-dissolve': 'avatar-dissolve 1.2s ease-in-out forwards',
        'glass-dissolve': 'glass-dissolve 1.2s ease-in-out 0.6s forwards',
        'opening-fade': 'opening-fade 1.8s ease-in-out forwards',
        'wallpaper-pop': 'wallpaper-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'music-pop': 'music-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'frame-shake': 'frame-shake 0.25s ease-in-out',
        'spa-leave': 'spa-leave 0.52s ease forwards',
        'spa-enter': 'spa-enter 0.52s ease both'
      }
    }
  }
};
