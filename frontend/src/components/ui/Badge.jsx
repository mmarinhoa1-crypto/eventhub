const variants = {
  blue: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  yellow: 'bg-amber-50 text-amber-700 border border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border border-rose-200',
  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  orange: 'bg-orange-50 text-orange-700 border border-orange-200',
}

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
