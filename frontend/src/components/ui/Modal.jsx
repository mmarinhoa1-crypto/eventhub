import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) {
      document.documentElement.classList.add('modal-open')
    } else {
      document.documentElement.classList.remove('modal-open')
    }
    return () => { document.documentElement.classList.remove('modal-open') }
  }, [open])

  if (!open) return null

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white dark:bg-zinc-900/90 dark:backdrop-blur-2xl dark:border dark:border-white/10 rounded-2xl shadow-2xl w-full ${widths[size]} mx-4 max-h-[90vh] overflow-y-auto transition-colors duration-300`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-white/40 dark:hover:text-white/70 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
