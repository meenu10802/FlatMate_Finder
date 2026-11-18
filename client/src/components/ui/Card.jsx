export default function Card({ as: Component = 'div', className = '', ...props }) {
  return (
    <Component
      className={`rounded-3xl border border-neutral-200 bg-white p-6 shadow-card dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      {...props}
    />
  );
}
