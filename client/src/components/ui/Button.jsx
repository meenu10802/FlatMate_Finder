const VARIANTS = {
  primary:
    'bg-black text-white hover:bg-neutral-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] dark:bg-white dark:text-black dark:hover:bg-neutral-200',
  secondary:
    'bg-white text-black border border-neutral-300 hover:border-black dark:bg-neutral-950 dark:text-white dark:border-neutral-700 dark:hover:border-white',
  ghost: 'text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-white',
  // For use on black sections.
  inverse: 'bg-white text-black hover:bg-neutral-200',
  'inverse-outline': 'border border-neutral-700 text-white hover:border-white',
};

const SIZES = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
};

/** Pass `as={Link}` to render a router link styled as a button. */
export default function Button({ as: Component = 'button', variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <Component
      className={`group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
