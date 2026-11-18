import { useQuery } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { api } from '../api/client.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Pill from '../components/ui/Pill.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';

export default function Landing() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get('/health').then((r) => r.data),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-4 py-16">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
          <Home size={16} /> Flatmate Finder
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find a flatmate who fits your life.</h1>
        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
          Match on smoking, pets, parties, cleanliness, budget and move-in date — then connect and chat.
        </p>
        <div className="flex gap-3">
          <Button size="lg">Get started</Button>
          <Button size="lg" variant="secondary">Browse flatmates</Button>
        </div>
      </header>

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Design system preview</h2>
        <div className="flex flex-wrap gap-2">
          <Pill active>Chennai</Pill>
          <Pill>Adyar</Pill>
          <Pill>Velachery</Pill>
          <Pill>Within 5 km</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value="flexible">Smoking: Flexible</StatusBadge>
          <StatusBadge value="occasionally">Parties: Occasionally</StatusBadge>
          <StatusBadge value="no">Pets: No</StatusBadge>
        </div>
        <div className="text-sm text-neutral-500">
          API:{' '}
          {health.isLoading ? (
            <StatusBadge tone="neutral">checking…</StatusBadge>
          ) : health.isSuccess ? (
            <StatusBadge tone="ok">connected</StatusBadge>
          ) : (
            <StatusBadge tone="bad">unreachable</StatusBadge>
          )}
        </div>
      </Card>
    </main>
  );
}
