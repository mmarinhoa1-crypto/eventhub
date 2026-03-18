export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-white/5 dark:text-white/90 dark:placeholder-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent ${
          error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 dark:border-white/10'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
