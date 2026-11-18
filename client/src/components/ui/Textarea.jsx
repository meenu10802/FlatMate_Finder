import { useId } from 'react';
import { Field, fieldClass } from './Input.jsx';

export default function Textarea({ label, error, hint, maxLength, value = '', className = '', ...props }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} msgId={msgId} className={className}>
      <div className="relative">
        <textarea
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? msgId : undefined}
          className={`min-h-[120px] resize-y py-3 ${fieldClass(error)}`}
          {...props}
        />
        {maxLength && (
          <span className="pointer-events-none absolute bottom-3 right-4 text-xs font-semibold text-neutral-600">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </Field>
  );
}
