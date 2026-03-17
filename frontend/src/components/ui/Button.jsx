import LoadingSpinner from './LoadingSpinner'

const variants = {
  primary: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-violet-700 focus:ring-blue-500 shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50',
  secondary: 'bg-white dark:bg-white/8 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/12 text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-blue-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
  ghost: 'text-gray-600 dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white/90 hover:bg-gray-100 focus:ring-gray-500',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" />}
      {children}
    </button>
  )
}
