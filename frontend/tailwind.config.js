/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'from-pink-500/20', 'to-purple-600/20', 'border-pink-500/30',
    'bg-gradient-to-r', 'bg-gradient-to-b', 'bg-gradient-to-br',
    'from-pink-500', 'to-purple-600', 'from-pink-600', 'to-purple-700',
    'from-gray-900', 'via-gray-900', 'to-purple-950',
    'border-white/10', 'bg-white/5',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
