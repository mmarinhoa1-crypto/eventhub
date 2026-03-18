export default function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-white dark:bg-white/5 dark:backdrop-blur-xl dark:border-white/8 rounded-2xl shadow-sm border border-gray-100 transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
