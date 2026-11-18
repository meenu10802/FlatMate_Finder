/** Grayscale score ring (CLAUDE.md §6: color meaning lives only in breakdown badges). */
export default function MatchScoreRing({ score, size = 72, stroke = 5, inverse = false, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const offset = c * (1 - value / 100);
  // The "match" caption only fits legibly (≥ 12px) on large rings; small rings rely on the aria-label.
  const showCaption = size >= 110;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${value} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          className={inverse ? 'stroke-neutral-800' : 'stroke-neutral-200 dark:stroke-neutral-800'} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-700 ${inverse ? 'stroke-white' : 'stroke-black dark:stroke-white'}`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden="true">
        <span className="font-display" style={{ fontSize: size * 0.34 }}>
          {value}
          {!showCaption && <span className="font-sans font-bold" style={{ fontSize: Math.max(12, size * 0.16) }}>%</span>}
        </span>
        {showCaption && <span className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-600">match</span>}
      </span>
    </div>
  );
}
