import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Pill from '../components/ui/Pill.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import DemoMatchCard from '../components/matches/DemoMatchCard.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { STATUS_DOTS } from '../lib/statusColor.js';

const NEIGHBOURHOODS = [
  'Adyar', 'Koramangala', 'Bandra West', 'Indiranagar', 'Velachery', 'Powai', 'HSR Layout',
  'Viman Nagar', 'Anna Nagar', 'Whitefield', 'Andheri West', 'Baner', 'Mylapore', 'Kothrud',
];

const FACTORS = [
  { n: '20', name: 'Budget', text: 'How much your rent ranges actually overlap.' },
  { n: '15', name: 'Smoking', text: 'Smoke-free, smoker, or genuinely easygoing.' },
  { n: '15', name: 'Pets', text: 'Dog people, cat people, and no-fur people.' },
  { n: '15', name: 'Parties', text: 'Quiet nights, the odd gathering, or open house.' },
  { n: '15', name: 'Cleanliness', text: 'A five-point scale, from relaxed to spotless.' },
  { n: '10', name: 'Move-in', text: 'Dates within two weeks score highest.' },
  { n: '10', name: 'Location', text: 'Same neighbourhood, or within your radius.' },
];

export default function Landing() {
  return (
    <main>
      <Hero />
      <Marquee />
      <Factors />
      <LocationSection />
      <Steps />
      <FinalCta />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots mask-radial pointer-events-none absolute inset-0 dark:hidden" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 shadow-card dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${STATUS_DOTS.ok}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_DOTS.ok}`} />
            </span>
            Now matching in Chennai, Bengaluru, Mumbai &amp; Pune
          </span>

          <h1 className="text-balance mt-7 font-display text-[52px] leading-[0.95] sm:text-[76px] lg:text-[88px]">
            Live with people who <em>get</em> you.
          </h1>

          <p className="mt-7 max-w-lg text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
            Flatmate Finder scores every potential flatmate on the things that decide whether sharing a home works —
            smoke, pets, parties, mess, money and moving day.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button as={Link} to="/register" size="lg">
              Find my flatmate <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button as="a" href="#how-it-works" size="lg" variant="ghost">
              How matching works
            </Button>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 divide-x divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {[
              ['7', 'factors'],
              ['0–100', 'match score'],
              ['21', 'neighbourhoods'],
            ].map(([v, l]) => (
              <div key={l} className="px-4 py-3 first:pl-0">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-3xl">{v}</dd>
                <dd className="text-xs font-bold uppercase tracking-wider text-neutral-500">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto h-[440px] w-full max-w-[400px]" aria-hidden="true">
          <div className="absolute left-2 top-6 h-[340px] w-[290px] -rotate-6 rounded-[28px] border border-neutral-200 bg-neutral-100 p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3 opacity-60">
              <Avatar name="Kabir Shah" size="md" />
              <div>
                <p className="font-medium">Kabir, 29</p>
                <p className="text-xs text-neutral-500">Indiranagar</p>
              </div>
            </div>
          </div>
          <DemoMatchCard className="absolute right-0 top-14 rotate-[3deg] motion-safe:animate-float" />
          <div className="absolute -left-2 bottom-6 rotate-[-4deg] rounded-2xl bg-black px-4 py-3 text-white shadow-lift">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">New request</p>
            <p className="mt-0.5 text-sm">Ananya wants to connect</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [...NEIGHBOURHOODS, ...NEIGHBOURHOODS];
  return (
    <div className="grain relative overflow-hidden bg-black py-5 text-white" aria-hidden="true">
      <div className="mask-fade-x">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {items.map((name, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-3xl">
              {name}
              <span className="font-sans text-base text-neutral-600">✱</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Factors() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:py-32">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <div>
          <Eyebrow>The match score</Eyebrow>
          <h2 className="text-balance mt-4 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Seven things that make or break a <em>flat share</em>.
          </h2>
        </div>
        <p className="max-w-md text-neutral-600 dark:text-neutral-400 lg:justify-self-end">
          Every profile is weighed against yours across seven factors and combined into one honest number out of 100 —
          with a breakdown showing exactly where you click and where you clash.
        </p>
      </div>

      <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800 dark:bg-neutral-800">
        {FACTORS.map((f) => (
          <div key={f.name} className="bg-white p-6 transition-colors hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">{f.name}</h3>
              <span className="text-xs font-semibold text-neutral-400">{f.n} pts</span>
            </div>
            <p className="mt-10 text-sm leading-relaxed text-neutral-500">{f.text}</p>
          </div>
        ))}
        <div className="grain relative flex flex-col justify-between bg-black p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Reading the breakdown</p>
          <div className="mt-6 flex flex-col items-start gap-2">
            <StatusBadge value="match">Match</StatusBadge>
            <StatusBadge value="partial">Partial</StatusBadge>
            <StatusBadge value="conflict">Conflict</StatusBadge>
          </div>
        </div>
      </div>
    </section>
  );
}

function LocationSection() {
  return (
    <section className="border-y border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-24 sm:py-32 lg:grid-cols-2">
        <div>
          <Eyebrow>Location, precisely</Eyebrow>
          <h2 className="text-balance mt-4 font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl">
            Find your <em>corner</em> of the city.
          </h2>
          <p className="mt-6 max-w-md text-neutral-600 dark:text-neutral-400">
            Pick a city, tap the neighbourhoods you love, and set how far you're willing to go. We'll only show people
            whose plans fit inside your map.
          </p>
        </div>

        <div className="rounded-[28px] border border-neutral-200 bg-sand-50 p-6 shadow-card dark:border-neutral-800 dark:bg-neutral-950" aria-hidden="true">
          <Eyebrow>City</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill active tabIndex={-1}>Chennai</Pill>
            <Pill tabIndex={-1}>Bengaluru</Pill>
            <Pill tabIndex={-1}>Mumbai</Pill>
            <Pill tabIndex={-1}>Pune</Pill>
          </div>
          <Eyebrow className="mt-7">Neighbourhoods</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill active tabIndex={-1}>Adyar</Pill>
            <Pill active tabIndex={-1}>Mylapore</Pill>
            <Pill tabIndex={-1}>T. Nagar</Pill>
            <Pill tabIndex={-1}>Velachery</Pill>
            <Pill tabIndex={-1}>Anna Nagar</Pill>
          </div>
          <div className="mt-7 flex items-baseline justify-between">
            <Eyebrow>Radius</Eyebrow>
            <span className="font-display text-2xl">5 km</span>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-black dark:bg-white" />
            <div className="absolute left-1/4 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white dark:border-white dark:bg-neutral-950" />
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold text-neutral-400">
            <span>1 km</span><span>25 km</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    ['01', 'Tell us how you live', 'Two minutes on habits, budget, move-in date and the neighbourhoods you want.'],
    ['02', 'See who fits', 'Browse people ranked by match score, with a clear breakdown for each.'],
    ['03', 'Connect & chat', 'Send a request. Once they accept, message them directly to plan a visit.'],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:py-32">
      <Eyebrow>How it works</Eyebrow>
      <div className="mt-10 grid gap-10 md:grid-cols-3">
        {steps.map(([n, title, text]) => (
          <div key={n} className="border-t border-black pt-6 dark:border-white">
            <span className="text-xs font-semibold text-neutral-500">{n}</span>
            <h3 className="mt-3 font-display text-3xl">{title}</h3>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24">
      <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-black px-8 py-20 text-white sm:px-16">
        <div className="bg-dots-inverse pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-end">
          <h2 className="text-balance max-w-2xl font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            Your next flatmate is <em>already looking</em>.
          </h2>
          <Button as={Link} to="/register" variant="inverse" size="lg">
            Create your profile <ArrowUpRight size={18} />
          </Button>
        </div>
      </div>
    </section>
  );
}
