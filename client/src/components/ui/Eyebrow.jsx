/** Small mono uppercase label used above headings. */
export default function Eyebrow({ className = '', children }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-wider text-neutral-500 ${className}`}>
      {children}
    </p>
  );
}
