import { CalendarDays, MapPin, Wallet } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import MatchScoreRing from './MatchScoreRing.jsx';

/** Illustrative match card for marketing surfaces (landing, auth). Sample data only. */
export default function DemoMatchCard({ className = '' }) {
  return (
    <div className={`w-[320px] rounded-[28px] border border-neutral-200 bg-white p-5 shadow-lift dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name="Ananya Rao" size="md" />
          <div>
            <p className="font-medium leading-tight">Ananya, 26</p>
            <p className="text-xs text-neutral-500">Product designer</p>
          </div>
        </div>
        <MatchScoreRing score={92} size={64} />
      </div>

      <div className="mt-5 space-y-2 border-t border-dashed border-neutral-200 pt-4 text-sm dark:border-neutral-800">
        <Row icon={MapPin}>Adyar, Chennai · 2.1 km</Row>
        <Row icon={Wallet}>₹18,000 – ₹24,000 / mo</Row>
        <Row icon={CalendarDays}>Moves in 1 Dec</Row>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <StatusBadge value="match">Smoke-free</StatusBadge>
        <StatusBadge value="match">Tidy · 4/5</StatusBadge>
        <StatusBadge value="partial">Parties: sometimes</StatusBadge>
        <StatusBadge value="match">Budget overlap</StatusBadge>
      </div>
    </div>
  );
}

function Row({ icon: Icon, children }) {
  return (
    <p className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
      <Icon size={14} className="text-neutral-400" /> {children}
    </p>
  );
}
