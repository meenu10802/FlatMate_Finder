import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import Button from '../components/ui/Button.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';

export default function NotFound() {
  usePageTitle('Page not found');
  const { user } = useAuth();
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start px-4 py-24">
      <Eyebrow>Error 404</Eyebrow>
      <h1 className="mt-4 font-display text-6xl leading-[0.95] sm:text-7xl">
        This room’s <em>already taken</em>.
      </h1>
      <p className="mt-5 max-w-md text-lg text-neutral-600">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-10 flex flex-wrap gap-2">
        <Button as={Link} to={user?.hasProfile ? '/browse' : '/'} size="lg">
          <ArrowLeft size={18} /> {user?.hasProfile ? 'Back to Browse' : 'Back home'}
        </Button>
      </div>
    </main>
  );
}
