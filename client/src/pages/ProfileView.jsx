import { usePageTitle } from '../hooks/usePageTitle.js';
import { Navigate, useParams } from 'react-router-dom';
import { useProfile } from '../api/profiles.js';
import { useAuth } from '../hooks/useAuth.js';
import ProfileDetail, { ProfileSkeleton } from '../components/profile/ProfileDetail.jsx';
import ConnectButton from '../components/profile/ConnectButton.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

export default function ProfileView() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useProfile(userId);
  usePageTitle(data?.profile?.name ?? 'Profile');

  if (user && Number(userId) === user.id) return <Navigate to="/me" replace />;
  if (isLoading) return <ProfileSkeleton />;
  if (error) {
    return error.status === 404
      ? <ErrorState title="Profile not found" message="This person may have paused or removed their profile." />
      : <ErrorState message={error.message} onRetry={refetch} />;
  }

  return <ProfileDetail profile={data.profile} match={data.match} actions={<ConnectButton userId={data.profile.userId} />} />;
}
