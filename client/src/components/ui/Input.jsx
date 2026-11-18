import { forwardRef, useId } from 'react';

export const fieldClass = (error) =>
  `w-full rounded-2xl border bg-white px-4 text-[15px] text-neutral-900 placeholder:text-neutral-500 transition-colors focus:border-black focus:outline-none focus:ring-4 focus:ring-neutral-200 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-white dark:focus:ring-neutral-800 ${
    error ? 'border-black dark:border-white' : 'border-neutral-300 hover:border-neutral-400 dark:border-neutral-700'
  }`;

/** Field wrapper with label + message. Errors are neutral, never red (CLAUDE.md §6). */
export function Field({ label, error, hint, htmlFor, msgId, className = '', children }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p id={msgId} className={`text-xs ${error ? 'font-medium text-black dark:text-white' : 'text-neutral-600'}`}>
          {error ? `↳ ${error}` : hint}
        </p>
      )}
    </div>
  );
}

/** `prefix` = static text before the value (e.g. ₹); `suffix` = interactive element at the end (e.g. show-password). */
const Input = forwardRef(function Input({ label, error, hint, className = '', id, prefix, suffix, ...props }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const msgId = `${inputId}-msg`;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId} msgId={msgId} className={className}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-neutral-600">{prefix}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? msgId : undefined}
          className={`h-12 ${fieldClass(error)} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-12' : ''}`}
          {...props}
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2">{suffix}</span>}
      </div>
    </Field>
  );
});

export default Input;
