/** Grayscale score ring (CLAUDE.md §6: color meaning lives only in breakdown badges). */
export default function MatchScoreRing({ score, size = 72, stroke = 5, inverse = false, className = '' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
          className={inverse ? 'stroke-neutral-800' : 'stroke-neutral-200 dark:stroke-neutral-800'} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-700 ${inverse ? 'stroke-white' : 'stroke-black dark:stroke-white'}`} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-display" style={{ fontSize: size * 0.36 }}>{Math.round(score)}</span>
        <span className="mt-0.5 font-bold uppercase tracking-wider text-neutral-500" style={{ fontSize: Math.max(8, size * 0.1) }}>match</span>
      </span>
    </div>
  );
}
