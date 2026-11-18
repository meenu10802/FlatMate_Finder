import { usePageTitle } from '../hooks/usePageTitle.js';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, PenLine } from 'lucide-react';
import { useMyProfile } from '../api/profiles.js';
import Button from '../components/ui/Button.jsx';
import ProfileDetail, { ProfileSkeleton } from '../components/profile/ProfileDetail.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

export default function MyProfile() {
  usePageTitle('Your profile');
  const { data: profile, isLoading, error, refetch } = useMyProfile();
  const justCreated = useLocation().state?.justCreated;

  if (isLoading) return <ProfileSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  return (
    <>
      {justCreated && (
        <div className="mx-auto mt-6 max-w-6xl px-4">
          <div className="flex flex-col items-start justify-between gap-4 rounded-[28px] bg-black px-6 py-5 text-white sm:flex-row sm:items-center">
            <p className="font-display text-2xl">Your profile is live. <em className="text-neutral-400">Now for the fun part.</em></p>
            <Button as={Link} to="/browse" variant="inverse">
              See your matches <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}
      <ProfileDetail
        profile={profile}
        isOwn
        actions={
          <Button as={Link} to="/me/edit" variant="secondary">
            <PenLine size={15} /> Edit profile
          </Button>
        }
      />
    </>
  );
}
