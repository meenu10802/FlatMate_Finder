/** Toggleable filter pill. Inactive = neutral outline, active = solid black (white in dark mode). */
export default function Pill({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm transition-all duration-150 active:scale-[0.97] ${
        active
          ? 'border-black bg-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] dark:border-white dark:bg-white dark:text-black'
          : 'border-neutral-300 bg-white text-neutral-700 hover:border-black hover:text-black dark:border-neutral-700 dark:bg-transparent dark:text-neutral-300 dark:hover:border-white dark:hover:text-white'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
