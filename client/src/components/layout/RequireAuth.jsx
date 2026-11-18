import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import FullPageSpinner from './FullPageSpinner.jsx';

/** Route guard. `requireProfile` sends users without a profile to onboarding. */
export function RequireAuth({ requireProfile = true }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (requireProfile && !user.hasProfile) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** For /login and /register: logged-in users are bounced into the app. */
export function GuestOnly() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to={user.hasProfile ? '/browse' : '/onboarding'} replace />;
  return <Outlet />;
}
