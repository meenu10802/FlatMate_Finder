import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useMyProfile } from '../api/profiles.js';
import { useFlatmates } from '../api/flatmates.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { RADIUS } from '../lib/constants.js';
import { CLEARED_PREFS, SORT_OPTIONS, activeChips, prefsToQuery, readPrefs, writePrefs } from '../lib/browseFilters.js';
import LocationFilter from '../components/filters/LocationFilter.jsx';
import PreferenceFilters from '../components/filters/PreferenceFilters.jsx';
import FlatmateCard, { FlatmateCardSkeleton } from '../components/matches/FlatmateCard.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

const num = (v) => (v == null || v === '' ? null : Number(v));
const clampRadius = (v) => Math.min(RADIUS.max, Math.max(RADIUS.min, v));

/** All filters live in the URL so searches are shareable and survive refresh. */
export default function Browse() {
  const [params, setParams] = useSearchParams();
  const me = useMyProfile();
  const [showFilters, setShowFilters] = useState(false);

  // Location: URL value → else the viewer's profile → else defaults.
  const hasUrlLocation = params.has('cityId') || params.has('areaId');
  const location = {
    cityId: num(params.get('cityId')) ?? (hasUrlLocation ? null : me.data?.city?.id ?? null),
    areaId: hasUrlLocation ? num(params.get('areaId')) : me.data?.area?.id ?? null,
    radiusKm: clampRadius(num(params.get('radiusKm')) ?? me.data?.searchRadiusKm ?? RADIUS.default),
  };
  const prefs = readPrefs(params);
  const prefsKey = params.toString();

  const debouncedRadius = useDebouncedValue(location.radiusKm, 250);
  const query = useMemo(
    () => ({
      cityId: location.cityId ?? undefined,
      areaId: location.areaId ?? undefined,
      radiusKm: debouncedRadius,
      ...prefsToQuery(prefs),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.cityId, location.areaId, debouncedRadius, prefsKey]
  );
  const results = useFlatmates(query, { enabled: Boolean(location.cityId) || me.isFetched });

  function update(patch) {
    const nextLoc = { ...location, ...pick(patch, ['cityId', 'areaId', 'radiusKm']) };
    const nextPrefs = { ...prefs, ...omit(patch, ['cityId', 'areaId', 'radiusKm']) };
    const p = new URLSearchParams();
    if (nextLoc.cityId) p.set('cityId', nextLoc.cityId);
    if (nextLoc.areaId) p.set('areaId', nextLoc.areaId);
    p.set('radiusKm', nextLoc.radiusKm);
    writePrefs(p, nextPrefs);
    setParams(p, { replace: true });
  }

  const chips = activeChips(prefs);
  const data = results.data;
  const originName = data?.origin ? (data.origin.type === 'area' ? data.origin.name : `${data.origin.name} centre`) : '…';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === prefs.sort)?.label.toLowerCase();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Browse flatmates</Eyebrow>
          <h1 className="mt-3 font-display text-5xl leading-[0.95] sm:text-6xl">
            People who <em>fit</em>.
          </h1>
        </div>
        <Button variant="secondary" className="lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="browse-filters">
          <SlidersHorizontal size={16} /> Filters{chips.length ? ` · ${chips.length}` : ''}
        </Button>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside
          id="browse-filters"
          className={`${showFilters ? 'block' : 'hidden'} h-fit space-y-8 rounded-[28px] border border-sand-200 bg-white p-6 shadow-card lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto dark:border-neutral-800 dark:bg-neutral-900`}
        >
          <LocationFilter value={location} onChange={update} />
          <div className="border-t border-sand-200 pt-8 dark:border-neutral-800">
            <PreferenceFilters value={prefs} onChange={update} />
          </div>
        </aside>

        <section aria-live="polite" aria-busy={results.isFetching}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {data ? (
                <>
                  <span className="font-bold text-black dark:text-white">{data.total}</span> {data.total === 1 ? 'flatmate' : 'flatmates'} within{' '}
                  <span className="font-bold text-black dark:text-white">{data.radiusKm} km</span> of {originName} · sorted by {sortLabel}
                </>
              ) : 'Finding flatmates…'}
            </p>
            {results.isFetching && data && <span className="text-xs font-semibold text-neutral-500">Updating…</span>}
          </div>

          {chips.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => update(c.clear)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black pl-3 pr-2 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-white dark:text-black"
                    aria-label={`Remove filter ${c.label}`}>
                    {c.label} <X size={13} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => update(CLEARED_PREFS)} className="h-8 px-2 text-xs font-semibold text-neutral-600 underline underline-offset-4 hover:text-black">
                  Clear all
                </button>
              </li>
            </ul>
          )}

          {results.isError ? (
            <ErrorState message={results.error.message} onRetry={results.refetch} />
          ) : !data ? (
            <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <FlatmateCardSkeleton key={i} />)}</div>
          ) : data.flatmates.length === 0 ? (
            <div className="flex flex-col items-center rounded-[28px] border-2 border-dashed border-sand-300 px-6 py-16 text-center dark:border-neutral-800">
              <SearchX size={32} className="text-neutral-500" />
              <p className="mt-4 font-display text-3xl">No one fits all of that yet.</p>
              <p className="mt-2 max-w-sm text-neutral-600 dark:text-neutral-400">
                {chips.length ? 'Try removing a filter or two.' : 'Try widening the radius or measuring from the city centre.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {chips.length > 0 && <Button variant="secondary" onClick={() => update(CLEARED_PREFS)}>Clear filters</Button>}
                {data.radiusKm < RADIUS.max && <Button variant="secondary" onClick={() => update({ radiusKm: RADIUS.max })}>Search all {RADIUS.max} km</Button>}
              </div>
            </div>
          ) : (
            <div className={`grid gap-5 transition-opacity sm:grid-cols-2 ${results.isFetching ? 'opacity-60' : ''}`}>
              {data.flatmates.map((f) => <FlatmateCard key={f.userId} flatmate={f} originName={originName} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const pick = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => keys.includes(k)));
const omit = (o, keys) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
