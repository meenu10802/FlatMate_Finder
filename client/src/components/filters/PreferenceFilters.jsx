import Pill from '../ui/Pill.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import { STATUS_DOTS, toneFor } from '../../lib/statusColor.js';
import { formatINRShort } from '../../lib/format.js';
import {
  BUDGET_OPTIONS, MIN_SCORE_OPTIONS, MOVE_IN_OPTIONS, PREF_FIELDS, ROOM_OPTIONS, SORT_OPTIONS,
} from '../../lib/browseFilters.js';

function Group({ title, hint, children }) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between">
        <Eyebrow>{title}</Eyebrow>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** Preference filter pills. value = prefs object from lib/browseFilters; onChange(patch). */
export default function PreferenceFilters({ value, onChange }) {
  const toggle = (key, v) => {
    const cur = value[key];
    onChange({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  return (
    <div className="space-y-6">
      <Group title="Sort by">
        {SORT_OPTIONS.map((o) => (
          <Pill key={o.value} active={value.sort === o.value} onClick={() => onChange({ sort: o.value })}>{o.label}</Pill>
        ))}
      </Group>

      <Group title="Minimum match">
        {MIN_SCORE_OPTIONS.map((s) => (
          <Pill key={s ?? 'any'} active={value.minScore === s} onClick={() => onChange({ minScore: s })}>{s ? `${s}+` : 'Any'}</Pill>
        ))}
      </Group>

      <Group title="Room">
        {ROOM_OPTIONS.map((o) => (
          <Pill key={o.label} active={value.hasRoom === o.value} onClick={() => onChange({ hasRoom: o.value })}>{o.label}</Pill>
        ))}
      </Group>

      {PREF_FIELDS.map(({ key, title, options }) => (
        <Group key={key} title={title} hint={value[key].length ? 'any of' : null}>
          {options.map((o) => (
            <Pill key={o.value} active={value[key].includes(o.value)} onClick={() => toggle(key, o.value)}>
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[toneFor(o.value)]}`} aria-hidden="true" />
              {o.label}
            </Pill>
          ))}
        </Group>
      ))}

      <Group title="Their budget starts under">
        {BUDGET_OPTIONS.map((b) => (
          <Pill key={b ?? 'any'} active={value.budgetMax === b} onClick={() => onChange({ budgetMax: b })}>{b ? formatINRShort(b) : 'Any'}</Pill>
        ))}
      </Group>

      <Group title="Moving in within">
        {MOVE_IN_OPTIONS.map((o) => (
          <Pill key={o.label} active={value.moveIn === o.value} onClick={() => onChange({ moveIn: o.value })}>{o.label}</Pill>
        ))}
      </Group>
    </div>
  );
}
