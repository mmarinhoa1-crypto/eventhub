/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  safelist: [
    // Gradients
    'from-pink-500/20', 'to-purple-600/20', 'border-pink-500/30',
    'bg-gradient-to-r', 'bg-gradient-to-b', 'bg-gradient-to-br',
    'from-pink-500', 'to-purple-600', 'from-pink-600', 'to-purple-700',
    'from-gray-900', 'via-gray-900', 'to-purple-950',
    // Glass/overlay utilities
    'border-white/10', 'bg-white/5', 'bg-white/4', 'bg-white/6', 'bg-white/8',
    'dark:bg-white/4', 'dark:bg-white/5', 'dark:bg-white/6', 'dark:bg-white/8',
    'dark:border-white/8', 'dark:border-white/10', 'dark:divide-white/6',
    // Accent
    'focus:ring-accent', 'bg-accent', 'text-accent', 'border-accent',
    // Dark mode — colored status badges (used dynamically via template literals)
    'dark:bg-blue-500/10', 'dark:bg-blue-500/20', 'dark:border-blue-500/20', 'dark:border-blue-500/30', 'dark:text-blue-400',
    'dark:bg-green-500/10', 'dark:bg-green-500/20', 'dark:border-green-500/25', 'dark:border-green-500/30', 'dark:text-green-400',
    'dark:bg-yellow-500/10', 'dark:bg-yellow-500/20', 'dark:border-yellow-500/30', 'dark:text-yellow-400',
    'dark:bg-red-500/10', 'dark:bg-red-500/20', 'dark:border-red-500/30', 'dark:text-red-400',
    'dark:bg-orange-500/10', 'dark:bg-orange-500/20', 'dark:border-orange-500/25', 'dark:border-orange-500/30', 'dark:text-orange-400',
    'dark:bg-indigo-500/10', 'dark:bg-indigo-500/20', 'dark:border-indigo-500/30', 'dark:text-indigo-400',
    'dark:bg-violet-500/10', 'dark:bg-violet-500/20', 'dark:border-violet-500/30', 'dark:text-violet-400',
    'dark:bg-purple-500/10', 'dark:bg-purple-500/20', 'dark:border-purple-500/30', 'dark:text-purple-400',
    'dark:bg-amber-500/20', 'dark:text-amber-400',
    'dark:bg-emerald-500/10', 'dark:bg-emerald-500/20', 'dark:border-emerald-500/30', 'dark:text-emerald-400',
    'dark:bg-pink-500/10', 'dark:bg-pink-500/20', 'dark:border-pink-500/30', 'dark:text-pink-400',
    'dark:bg-rose-500/10', 'dark:bg-rose-500/20', 'dark:border-rose-500/25', 'dark:border-rose-500/30', 'dark:text-rose-400',
    'dark:bg-sky-500/10', 'dark:bg-sky-500/20', 'dark:text-sky-400',
    // KPICard/DashboardFinanceiro dynamic color objects
    'dark:border-emerald-500/25', 'dark:border-blue-500/25', 'dark:border-violet-500/25',
    'dark:bg-rose-100', 'dark:bg-rose-500/20', 'dark:text-rose-600',
    'dark:bg-violet-500/20', 'dark:bg-emerald-500/20',
    // Dynamic hover states (bgMap, status toggles)
    'dark:hover:bg-blue-500/10', 'dark:hover:bg-green-500/10',
    'dark:hover:bg-orange-500/10', 'dark:hover:bg-orange-500/20',
    'dark:hover:bg-purple-500/20', 'dark:hover:bg-red-500/20',
    // Calendar + day number text
    'dark:text-white/20', 'dark:text-white/90',
    // statusDot solid color
    'dark:bg-yellow-500',
    // Blue progress bar
    'dark:bg-blue-500/30',
    // Etiquetas (dynamic bg/color/border in MinhasDemandas)
    'dark:text-white/40', 'dark:text-white/60', 'dark:text-white/70', 'dark:text-white/80', 'dark:text-white/90',
    'dark:bg-white/[0.03]', 'dark:bg-white/[0.04]', 'dark:bg-white/[0.05]', 'dark:bg-white/[0.06]',
    'dark:border-white/[0.06]', 'dark:border-white/[0.08]',
    'dark:hover:bg-white/10', 'dark:hover:bg-white/15',
    'dark:hover:text-white',
    // Sidebar link states (dynamic className strings)
    'dark:bg-white/20', 'dark:text-white',
    'dark:text-white/60', 'dark:hover:bg-white/10',
    'dark:text-white/70', 'dark:hover:bg-white/15',
    'dark:text-white/50', 'dark:bg-white/15',
    'dark:hover:bg-red-500/10', 'dark:hover:text-red-300', 'dark:text-red-400/80',
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
