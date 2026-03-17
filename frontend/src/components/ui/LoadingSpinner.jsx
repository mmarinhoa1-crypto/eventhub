const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export default function LoadingSpinner({ size = 'md' }) {
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600`} />
  )
}
