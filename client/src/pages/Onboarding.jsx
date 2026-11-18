import { usePageTitle } from '../hooks/usePageTitle.js';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ProfileWizard from '../components/profile/ProfileWizard.jsx';

export default function Onboarding() {
  usePageTitle('Set up your profile');
  const { user } = useAuth();
  const navigate = useNavigate();
  // Checked once at mount: saving flips hasProfile mid-flow and must not trigger this redirect.
  const [hadProfileOnArrival] = useState(() => Boolean(user?.hasProfile));

  if (hadProfileOnArrival) return <Navigate to="/me/edit" replace />;
  return <ProfileWizard mode="create" onSaved={() => navigate('/me', { replace: true, state: { justCreated: true } })} />;
}
