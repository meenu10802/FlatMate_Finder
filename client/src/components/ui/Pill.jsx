/** Toggleable filter pill. Inactive = neutral outline, active = solid black (white in dark mode). */
export default function Pill({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
        active
          ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
          : 'border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
