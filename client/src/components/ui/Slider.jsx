import { useId } from 'react';

/** Monochrome range slider with a filled track. */
export default function Slider({ label, value, min, max, step = 1, onChange, format = (v) => v, minLabel, maxLabel }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{label}</label>
        <span className="font-display text-3xl leading-none">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-4"
        style={{ '--fill': `${pct}%` }}
      />
      <div className="mt-2 flex justify-between text-xs font-semibold text-neutral-600">
        <span>{minLabel ?? format(min)}</span>
        <span>{maxLabel ?? format(max)}</span>
      </div>
    </div>
  );
}
