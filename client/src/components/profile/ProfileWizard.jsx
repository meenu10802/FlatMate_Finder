import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useSaveProfile } from '../../api/profiles.js';
import Button from '../ui/Button.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import { AboutStep, WhereStep, LifestyleStep, BudgetStep } from './WizardSteps.jsx';

const STEPS = [
  { key: 'about', title: 'About you', blurb: 'The basics people see first.', fields: ['age', 'gender', 'occupation', 'bio', 'avatarUrl'], Component: AboutStep },
  { key: 'where', title: 'Where', blurb: 'Your situation, city, favourite neighbourhood and how far you’d go.', fields: ['hasRoom', 'roomPhotoUrl', 'cityId', 'areaId', 'searchRadiusKm'], Component: WhereStep },
  { key: 'lifestyle', title: 'How you live', blurb: 'Be honest — this is what the match score runs on.', fields: ['smoking', 'pets', 'parties', 'cleanliness'], Component: LifestyleStep },
  { key: 'budget', title: 'Budget & timing', blurb: 'Your monthly rent range and when you want to move.', fields: ['budgetMin', 'budgetMax', 'moveInDate'], Component: BudgetStep },
];

const EMPTY = {
  age: '', gender: '', occupation: '', bio: '', avatarUrl: '', hasRoom: false, roomPhotoUrl: '',
  cityId: null, areaId: null, searchRadiusKm: 5,
  smoking: null, pets: null, parties: null, cleanliness: null,
  budgetMin: '', budgetMax: '', moveInDate: '',
};

function fromProfile(p) {
  if (!p) return EMPTY;
  return {
    age: String(p.age ?? ''), gender: p.gender ?? '', occupation: p.occupation ?? '', bio: p.bio ?? '', avatarUrl: p.avatarUrl ?? '', hasRoom: Boolean(p.hasRoom), roomPhotoUrl: p.roomPhotoUrl ?? '',
    cityId: p.city?.id ?? null, areaId: p.area?.id ?? null, searchRadiusKm: p.searchRadiusKm ?? 5,
    smoking: p.smoking, pets: p.pets, parties: p.parties, cleanliness: p.cleanliness,
    budgetMin: String(p.budgetMin ?? ''), budgetMax: String(p.budgetMax ?? ''), moveInDate: p.moveInDate ?? '',
  };
}

function validateStep(key, f) {
  const e = {};
  if (key === 'about') {
    const age = Number(f.age);
    if (!f.age) e.age = 'Enter your age';
    else if (!Number.isInteger(age) || age < 18 || age > 99) e.age = 'Age must be between 18 and 99';
    if (f.avatarUrl && !/^https?:\/\/\S+$/i.test(f.avatarUrl)) e.avatarUrl = 'Use a link starting with http(s)://';
  }
  if (key === 'where') {
    if (!f.cityId) e.cityId = 'Pick a city';
    if (f.hasRoom && f.roomPhotoUrl && !/^https?:\/\/\S+$/i.test(f.roomPhotoUrl)) e.roomPhotoUrl = 'Use a link starting with http(s)://';
  }
  if (key === 'lifestyle') {
    if (!f.smoking) e.smoking = 'Choose one';
    if (!f.pets) e.pets = 'Choose one';
    if (!f.parties) e.parties = 'Choose one';
    if (!f.cleanliness) e.cleanliness = 'Choose a level';
  }
  if (key === 'budget') {
    if (f.budgetMin === '') e.budgetMin = 'Enter a minimum';
    if (f.budgetMax === '') e.budgetMax = 'Enter a maximum';
    if (f.budgetMin !== '' && f.budgetMax !== '' && Number(f.budgetMin) > Number(f.budgetMax)) e.budgetMax = 'Max must be at least the min';
    if (!f.moveInDate) e.moveInDate = 'Pick a move-in date';
  }
  return e;
}

const toPayload = (f) => ({
  age: Number(f.age),
  gender: f.gender || null,
  occupation: f.occupation.trim() || null,
  bio: f.bio.trim() || null,
  avatarUrl: f.avatarUrl.trim() || null,
  hasRoom: f.hasRoom,
  roomPhotoUrl: f.hasRoom ? f.roomPhotoUrl.trim() || null : null,
  cityId: f.cityId,
  areaId: f.areaId,
  searchRadiusKm: f.searchRadiusKm,
  smoking: f.smoking,
  pets: f.pets,
  parties: f.parties,
  cleanliness: f.cleanliness,
  budgetMin: Number(f.budgetMin),
  budgetMax: Number(f.budgetMax),
  moveInDate: f.moveInDate,
});

/**
 * Multi-step profile form.
 * mode="create": linear Continue → Create. mode="edit": jump between steps freely, Save from any step.
 */
export default function ProfileWizard({ mode = 'create', initial, onSaved }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState(() => fromProfile(initial));
  const [stepIdx, setStepIdx] = useState(0);
  const [maxReached, setMaxReached] = useState(isEdit ? STEPS.length - 1 : 0);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const save = useSaveProfile();

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const goTo = (i) => {
    setStepIdx(i);
    setMaxReached((m) => Math.max(m, i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function submit() {
    // Validate every step; jump to the first one with problems.
    for (let i = 0; i < STEPS.length; i++) {
      const e = validateStep(STEPS[i].key, form);
      if (Object.keys(e).length) {
        setErrors(e);
        goTo(i);
        return;
      }
    }
    setFormError('');
    try {
      const profile = await save.mutateAsync(toPayload(form));
      onSaved?.(profile);
    } catch (err) {
      const fe = err.details?.fieldErrors;
      if (fe && Object.keys(fe).length) {
        setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v[0]])));
        const idx = STEPS.findIndex((s) => s.fields.some((f) => fe[f]));
        if (idx >= 0) goTo(idx);
      } else {
        setFormError(err.message);
      }
    }
  }

  function next() {
    const e = validateStep(step.key, form);
    if (Object.keys(e).length) return setErrors(e);
    if (isLast) submit();
    else goTo(stepIdx + 1);
  }

  const { Component } = step;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[300px_1fr] lg:py-16">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <Eyebrow>{isEdit ? 'Edit profile' : 'Step 2 of 2 · Profile'}</Eyebrow>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight">
          {isEdit ? <>Fine-tune your <em>profile</em>.</> : <>Tell us how you <em>live</em>.</>}
        </h1>

        {/* Mobile progress */}
        <div className="mt-6 flex gap-1.5 lg:hidden" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.key} className={`h-1 flex-1 rounded-full ${i <= stepIdx ? 'bg-black dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
          ))}
        </div>

        <ol className="mt-10 hidden space-y-1 lg:block">
          {STEPS.map((s, i) => {
            const active = i === stepIdx;
            const reachable = i <= maxReached;
            const done = !active && reachable && Object.keys(validateStep(s.key, form)).length === 0;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                    active ? 'bg-white shadow-card dark:bg-neutral-900' : 'hover:bg-neutral-100 disabled:hover:bg-transparent dark:hover:bg-neutral-900'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      active || done
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-neutral-300 text-neutral-500 dark:border-neutral-700'
                    }`}
                  >
                    {done ? <Check size={14} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`text-sm ${active ? 'font-medium' : reachable ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400'}`}>
                    {s.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="rounded-[32px] border border-neutral-200 bg-white p-6 shadow-card sm:p-10 dark:border-neutral-800 dark:bg-neutral-900">
        <header key={step.key} className="animate-rise">
          <Eyebrow>Step {stepIdx + 1} of {STEPS.length}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl tracking-tight">{step.title}</h2>
          <p className="mt-2 text-neutral-600">{step.blurb}</p>
        </header>

        <div key={`${step.key}-body`} className="mt-10 animate-rise">
          <Component form={form} update={update} errors={errors} />
        </div>

        {formError && (
          <p role="alert" className="mt-8 rounded-2xl border border-black px-4 py-3 text-sm font-medium dark:border-white">
            {formError}
          </p>
        )}

        <footer className="mt-12 flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <Button variant="ghost" onClick={() => goTo(stepIdx - 1)} disabled={stepIdx === 0}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex gap-2">
            {isEdit && !isLast && (
              <Button variant="secondary" onClick={next}>
                Next <ArrowRight size={16} />
              </Button>
            )}
            {isEdit ? (
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            ) : (
              <Button onClick={next} disabled={save.isPending}>
                {isLast ? (save.isPending ? 'Creating…' : 'Create profile') : 'Continue'}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
