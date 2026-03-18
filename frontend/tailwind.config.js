/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  safelist: [
    'from-pink-500/20', 'to-purple-600/20', 'border-pink-500/30',
    'bg-gradient-to-r', 'bg-gradient-to-b', 'bg-gradient-to-br',
    'from-pink-500', 'to-purple-600', 'from-pink-600', 'to-purple-700',
    'from-gray-900', 'via-gray-900', 'to-purple-950',
    'border-white/10', 'bg-white/5', 'bg-white/4', 'bg-white/6', 'bg-white/8',
    'dark:bg-white/4', 'dark:bg-white/5', 'dark:bg-white/6', 'dark:bg-white/8',
    'dark:border-white/8', 'dark:border-white/10', 'dark:divide-white/6',
    'focus:ring-accent', 'bg-accent', 'text-accent', 'border-accent',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        accent: '#f80d52',
      },
    },
  },
  plugins: [],
}
