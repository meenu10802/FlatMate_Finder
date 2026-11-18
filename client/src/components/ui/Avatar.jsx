const SIZES = {
  sm: 'h-9 w-9 text-base',
  md: 'h-12 w-12 text-xl',
  lg: 'h-20 w-20 text-4xl',
  xl: 'h-28 w-28 text-5xl',
};

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Photo in grayscale, or a serif monogram. */
export default function Avatar({ name, src, size = 'md', className = '' }) {
  const base = `relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-neutral-200 dark:ring-neutral-800 ${SIZES[size]} ${className}`;
  if (src) {
    return (
      <span className={base}>
        <img src={src} alt={name} className="h-full w-full object-cover grayscale" />
      </span>
    );
  }
  return (
    <span className={`${base} bg-neutral-100 font-display text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100`} aria-label={name}>
      {initials(name)}
    </span>
  );
}
