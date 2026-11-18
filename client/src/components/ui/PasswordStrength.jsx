import { passwordStrength } from '../../lib/passwordStrength.js';
import { STATUS_DOTS, STATUS_TEXT, toneFor } from '../../lib/statusColor.js';

const LABEL = { weak: 'Weak', medium: 'Medium', good: 'Good' };

/** 3-segment meter: red Weak → yellow Medium → green Good. */
export default function PasswordStrength({ password }) {
  if (!password) return null;
  const { level, score, tip } = passwordStrength(password);
  const tone = toneFor(level);

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? STATUS_DOTS[tone] : 'bg-sand-200 dark:bg-neutral-800'}`}
          />
        ))}
      </div>
      <p className="flex items-center justify-between text-xs">
        <span className={`font-bold ${STATUS_TEXT[tone]}`}>
          <span className="sr-only">Password strength: </span>{LABEL[level]}
        </span>
        <span className="text-neutral-600 dark:text-neutral-400">{tip}</span>
      </p>
    </div>
  );
}
