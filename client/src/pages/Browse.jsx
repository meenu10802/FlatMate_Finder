import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useMyProfile } from '../api/profiles.js';
import { useFlatmates } from '../api/flatmates.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { RADIUS } from '../lib/constants.js';
import LocationFilter from '../components/filters/LocationFilter.jsx';
import FlatmateCard, { FlatmateCardSkeleton } from '../components/matches/FlatmateCard.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import Button from '../components/ui/Button.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

const num = (v) => (v == null || v === '' ? null : Number(v));
const clampRadius = (v) => Math.min(RADIUS.max, Math.max(RADIUS.min, v));

/** Filters live in the URL (?cityId&areaId&radiusKm) so searches are shareable and survive refresh. */
export default function Browse() {
  const [params, setParams] = useSearchParams();
  const me = useMyProfile();

  // URL value → else the viewer's profile → else defaults.
  const hasUrlLocation = params.has('cityId') || params.has('areaId');
  const filters = {
    cityId: num(params.get('cityId')) ?? (hasUrlLocation ? null : me.data?.city?.id ?? null),
    areaId: hasUrlLocation ? num(params.get('areaId')) : me.data?.area?.id ?? null,
    radiusKm: clampRadius(num(params.get('radiusKm')) ?? me.data?.searchRadiusKm ?? RADIUS.default),
  };

  const debouncedRadius = useDebouncedValue(filters.radiusKm, 250);
  const query = useMemo(
    () => ({ cityId: filters.cityId ?? undefined, areaId: filters.areaId ?? undefined, radiusKm: debouncedRadius }),
    [filters.cityId, filters.areaId, debouncedRadius]
  );
  const results = useFlatmates(query, { enabled: Boolean(filters.cityId) || me.isFetched });

  function update(patch) {
    const next = { ...filters, ...patch };
    const p = new URLSearchParams();
    if (next.cityId) p.set('cityId', next.cityId);
    if (next.areaId) p.set('areaId', next.areaId);
    p.set('radiusKm', next.radiusKm);
    setParams(p, { replace: true });
  }

  const data = results.data;
  const originName = data?.origin ? (data.origin.type === 'area' ? data.origin.name : `${data.origin.name} centre`) : '…';

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <header>
        <Eyebrow>Browse flatmates</Eyebrow>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] sm:text-6xl">
          People <em>near you</em>.
        </h1>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-[28px] border border-sand-200 bg-white p-6 shadow-card lg:sticky lg:top-28 dark:border-neutral-800 dark:bg-neutral-900">
          <LocationFilter value={filters} onChange={update} />
        </aside>

        <section aria-live="polite" aria-busy={results.isFetching}>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {data ? (
                <>
                  <span className="font-bold text-black dark:text-white">{data.total}</span> {data.total === 1 ? 'flatmate' : 'flatmates'} within{' '}
                  <span className="font-bold text-black dark:text-white">{data.radiusKm} km</span> of {originName}
                </>
              ) : 'Finding flatmates…'}
            </p>
            {results.isFetching && data && <span className="text-xs font-semibold text-neutral-500">Updating…</span>}
          </div>

          {results.isError ? (
            <ErrorState message={results.error.message} onRetry={results.refetch} />
          ) : !data ? (
            <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <FlatmateCardSkeleton key={i} />)}</div>
          ) : data.flatmates.length === 0 ? (
            <div className="flex flex-col items-center rounded-[28px] border-2 border-dashed border-sand-300 px-6 py-16 text-center dark:border-neutral-800">
              <SearchX size={32} className="text-neutral-500" />
              <p className="mt-4 font-display text-3xl">Nobody within {data.radiusKm} km yet.</p>
              <p className="mt-2 max-w-sm text-neutral-600 dark:text-neutral-400">Try widening the radius or measuring from the city centre.</p>
              {data.radiusKm < RADIUS.max && (
                <Button variant="secondary" className="mt-6" onClick={() => update({ radiusKm: RADIUS.max })}>
                  Search all {RADIUS.max} km
                </Button>
              )}
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
