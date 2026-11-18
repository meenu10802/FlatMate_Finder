import Eyebrow from '../components/ui/Eyebrow.jsx';

/** Temporary page for routes built in later phases. */
export default function Placeholder({ title, phase }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24">
      <Eyebrow>Coming in phase {phase}</Eyebrow>
      <h1 className="mt-4 font-display text-6xl tracking-tight">{title}</h1>
      <p className="mt-4 max-w-md text-neutral-500">This part of Flatmate Finder is still being built.</p>
    </main>
  );
}
