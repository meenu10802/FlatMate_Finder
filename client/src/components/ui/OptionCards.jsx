import { Check } from 'lucide-react';
import { STATUS_DOTS, toneFor } from '../../lib/statusColor.js';

/**
 * Radio group rendered as cards. Selected = solid black.
 * Each option shows a small status dot so users learn what each choice means for matching.
 */
export default function OptionCards({ label, options, value, onChange, columns = 3, showStatus = true }) {
  return (
    <fieldset>
      {label && <legend className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</legend>}
      <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(o.value)}
              className={`relative rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.98] ${
                selected
                  ? 'border-black bg-black text-white shadow-lift dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600'
              }`}
            >
              <span className="flex items-center gap-2">
                {showStatus && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[toneFor(o.value)]}`} aria-hidden="true" />}
                <span className="text-sm font-medium">{o.label}</span>
              </span>
              {o.desc && (
                <span className={`mt-1.5 block text-xs leading-snug ${selected ? 'text-neutral-400 dark:text-neutral-600' : 'text-neutral-600'}`}>
                  {o.desc}
                </span>
              )}
              {selected && <Check size={14} className="absolute right-3 top-3" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
