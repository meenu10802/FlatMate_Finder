import { usePageTitle } from '../hooks/usePageTitle.js';
import { useNavigate } from 'react-router-dom';
import { useMyProfile } from '../api/profiles.js';
import ProfileWizard from '../components/profile/ProfileWizard.jsx';
import FullPageSpinner from '../components/layout/FullPageSpinner.jsx';
import ErrorState from '../components/layout/ErrorState.jsx';

export default function EditProfile() {
  usePageTitle('Edit profile');
  const { data: profile, isLoading, error, refetch } = useMyProfile();
  const navigate = useNavigate();

  if (isLoading) return <FullPageSpinner />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  return <ProfileWizard mode="edit" initial={profile} onSaved={() => navigate('/me')} />;
}
