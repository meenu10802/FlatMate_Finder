import { useCities, useAreas } from '../../api/locations.js';
import {
  CLEANLINESS_LABELS, GENDER_OPTIONS, PARTIES_OPTIONS, PETS_OPTIONS, RADIUS, SMOKING_OPTIONS,
} from '../../lib/constants.js';
import { formatINR, formatINRShort, relativeDays, toISODate } from '../../lib/format.js';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Pill from '../ui/Pill.jsx';
import Slider from '../ui/Slider.jsx';
import OptionCards from '../ui/OptionCards.jsx';
import PhotoUrlField from '../ui/PhotoUrlField.jsx';

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="mt-2 text-xs font-medium text-black dark:text-white">↳ {children}</p>;
}

function Label({ children, aside }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{children}</p>
      {aside}
    </div>
  );
}

function SkeletonPills({ n = 4 }) {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="h-9 w-24 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
      ))}
    </div>
  );
}

const digitsOnly = (s) => s.replace(/\D/g, '').slice(0, 8);

/* ───────────────────────── Step 1 ───────────────────────── */

export function AboutStep({ form, update, errors }) {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Age" type="number" inputMode="numeric" min={18} max={99} placeholder="26"
          value={form.age} onChange={(e) => update({ age: e.target.value })} error={errors.age} />
        <Input label="What do you do?" placeholder="Product designer" maxLength={100}
          value={form.occupation} onChange={(e) => update({ occupation: e.target.value })} error={errors.occupation} />
      </div>

      <div>
        <Label aside={<span className="text-xs text-neutral-600">Optional</span>}>Gender</Label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((g) => (
            <Pill key={g} active={form.gender === g} onClick={() => update({ gender: form.gender === g ? '' : g })}>
              {g}
            </Pill>
          ))}
        </div>
      </div>

      <Textarea label="A little about you" maxLength={1000} placeholder="Early riser, cook on weekends, work from home twice a week…"
        value={form.bio} onChange={(e) => update({ bio: e.target.value })} error={errors.bio} />

      <PhotoUrlField kind="person" value={form.avatarUrl} onChange={(v) => update({ avatarUrl: v })} error={errors.avatarUrl} />
    </div>
  );
}

const SITUATION_OPTIONS = [
  { value: 'seeking', label: 'Looking for a place', desc: 'I want to find a flat and flatmates' },
  { value: 'offering', label: 'Have a room to share', desc: 'I have a flat with a room free' },
];

/* ───────────────────────── Step 2 ───────────────────────── */

export function WhereStep({ form, update, errors }) {
  const cities = useCities();
  const areas = useAreas(form.cityId);
  const city = cities.data?.find((c) => c.id === form.cityId);

  return (
    <div className="space-y-10">
      <div>
        <OptionCards
          label="Do you already have a place?"
          options={SITUATION_OPTIONS}
          columns={2}
          showStatus={false}
          value={form.hasRoom ? 'offering' : 'seeking'}
          onChange={(v) => update({ hasRoom: v === 'offering' })}
        />
        {form.hasRoom && (
          <div className="mt-6 animate-rise rounded-3xl border border-sand-300 bg-sand-50 p-5 dark:border-neutral-800 dark:bg-neutral-950">
            <PhotoUrlField kind="room" value={form.roomPhotoUrl} onChange={(v) => update({ roomPhotoUrl: v })} error={errors.roomPhotoUrl} />
          </div>
        )}
      </div>

      <div>
        <Label>City</Label>
        {cities.isLoading ? (
          <SkeletonPills />
        ) : cities.isError ? (
          <p className="text-sm text-neutral-600">Couldn’t load cities. Is the API running?</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cities.data.map((c) => (
              <Pill key={c.id} active={form.cityId === c.id}
                onClick={() => form.cityId !== c.id && update({ cityId: c.id, areaId: null })}>
                {c.name}
              </Pill>
            ))}
          </div>
        )}
        <ErrorText>{errors.cityId}</ErrorText>
      </div>

      {form.cityId && (
        <div className="animate-rise">
          <Label aside={<span className="text-xs text-neutral-600">Pick your favourite</span>}>Neighbourhood</Label>
          {areas.isLoading ? (
            <SkeletonPills n={6} />
          ) : (
            <div className="flex flex-wrap gap-2">
              <Pill active={form.areaId === null} onClick={() => update({ areaId: null })}>
                Anywhere in {city?.name ?? 'the city'}
              </Pill>
              {areas.data?.map((a) => (
                <Pill key={a.id} active={form.areaId === a.id} onClick={() => update({ areaId: a.id })}>
                  {a.name}
                </Pill>
              ))}
            </div>
          )}
          <ErrorText>{errors.areaId}</ErrorText>
        </div>
      )}

      <div className="rounded-3xl border border-neutral-200 bg-sand-50 p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <Slider label="How far would you go?" min={RADIUS.min} max={RADIUS.max}
          value={form.searchRadiusKm} onChange={(v) => update({ searchRadiusKm: v })} format={(v) => `${v} km`} />
        <p className="mt-4 text-xs text-neutral-600">
          {form.areaId ? 'Measured from your chosen neighbourhood.' : 'Measured from the city centre.'}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Step 3 ───────────────────────── */

export function LifestyleStep({ form, update, errors }) {
  return (
    <div className="space-y-10">
      {[
        ['smoking', 'Smoking', SMOKING_OPTIONS],
        ['pets', 'Pets', PETS_OPTIONS],
        ['parties', 'House parties', PARTIES_OPTIONS],
      ].map(([key, label, options]) => (
        <div key={key}>
          <OptionCards label={label} options={options} value={form[key]} onChange={(v) => update({ [key]: v })} />
          <ErrorText>{errors[key]}</ErrorText>
        </div>
      ))}

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">Cleanliness</legend>
        <div role="radiogroup" className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((level) => {
            const selected = form.cleanliness === level;
            return (
              <button key={level} type="button" role="radio" aria-checked={selected}
                onClick={() => update({ cleanliness: level })}
                className={`flex flex-col items-center gap-3 rounded-2xl border px-2 pb-3 pt-4 transition-all active:scale-[0.97] ${
                  selected
                    ? 'border-black bg-black text-white shadow-lift dark:border-white dark:bg-white dark:text-black'
                    : 'border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950'
                }`}>
                <span className="flex h-8 items-end gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <span key={b} className={`w-1.5 rounded-full ${b <= level ? (selected ? 'bg-current' : 'bg-black dark:bg-white') : 'bg-neutral-200 dark:bg-neutral-700'}`}
                      style={{ height: `${b * 20}%` }} />
                  ))}
                </span>
                <span className="text-xs font-medium">{CLEANLINESS_LABELS[level]}</span>
              </button>
            );
          })}
        </div>
        <ErrorText>{errors.cleanliness}</ErrorText>
      </fieldset>
    </div>
  );
}

/* ───────────────────────── Step 4 ───────────────────────── */

const BUDGET_PRESETS = [
  [5000, 10000],
  [10000, 20000],
  [20000, 35000],
  [35000, 60000],
];

function moveInPresets() {
  const today = new Date();
  const firstOf = (offset) => new Date(today.getFullYear(), today.getMonth() + offset, 1);
  return [
    ['ASAP', toISODate(today)],
    ['Next month', toISODate(firstOf(1))],
    ['In 2 months', toISODate(firstOf(2))],
    ['In 3 months', toISODate(firstOf(3))],
  ];
}

export function BudgetStep({ form, update, errors }) {
  const hasBudget = form.budgetMin !== '' && form.budgetMax !== '';
  const today = toISODate(new Date());

  return (
    <div className="space-y-12">
      <div>
        <Label>Monthly rent (your share)</Label>
        <div className="mb-5 flex flex-wrap gap-2">
          {BUDGET_PRESETS.map(([min, max]) => (
            <Pill key={min} active={Number(form.budgetMin) === min && Number(form.budgetMax) === max}
              onClick={() => update({ budgetMin: String(min), budgetMax: String(max) })}>
              {formatINRShort(min)} – {formatINRShort(max)}
            </Pill>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Minimum" inputMode="numeric" prefix="₹" placeholder="15000"
            value={form.budgetMin} onChange={(e) => update({ budgetMin: digitsOnly(e.target.value) })} error={errors.budgetMin} />
          <Input label="Maximum" inputMode="numeric" prefix="₹" placeholder="25000"
            value={form.budgetMax} onChange={(e) => update({ budgetMax: digitsOnly(e.target.value) })} error={errors.budgetMax} />
        </div>
        {hasBudget && (
          <p className="mt-5 font-display text-3xl">
            {formatINR(form.budgetMin)} <span className="text-neutral-500">–</span> {formatINR(form.budgetMax)}
            <span className="ml-2 font-sans text-sm text-neutral-600">/ month</span>
          </p>
        )}
      </div>

      <div>
        <Label>Move-in date</Label>
        <div className="mb-5 flex flex-wrap gap-2">
          {moveInPresets().map(([label, date]) => (
            <Pill key={label} active={form.moveInDate === date} onClick={() => update({ moveInDate: date })}>
              {label}
            </Pill>
          ))}
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Input type="date" label="Or pick a date" min={today}
            value={form.moveInDate} onChange={(e) => update({ moveInDate: e.target.value })} error={errors.moveInDate} />
          {form.moveInDate && <p className="pb-3 font-display text-3xl text-neutral-600">{relativeDays(form.moveInDate)}</p>}
        </div>
      </div>
    </div>
  );
}
