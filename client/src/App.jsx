import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import PageShell from './components/layout/PageShell.jsx';
import ScrollToTop from './components/layout/ScrollToTop.jsx';
import { GuestOnly, RequireAuth } from './components/layout/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import AuthForm from './pages/AuthForm.jsx';
import Onboarding from './pages/Onboarding.jsx';
import MyProfile from './pages/MyProfile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import ProfileView from './pages/ProfileView.jsx';
import Browse from './pages/Browse.jsx';
import Inbox from './pages/Inbox.jsx';
import Connections from './pages/Connections.jsx';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<PageShell />}>
          <Route path="/" element={<Landing />} />

          <Route element={<GuestOnly />}>
            <Route path="/login" element={<AuthForm mode="login" />} />
            <Route path="/register" element={<AuthForm mode="register" />} />
          </Route>

          <Route element={<RequireAuth requireProfile={false} />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/me" element={<MyProfile />} />
            <Route path="/me/edit" element={<EditProfile />} />
            <Route path="/profiles/:userId" element={<ProfileView />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/inbox/:connectionId" element={<Inbox />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </SocketProvider>
    </AuthProvider>
  );
}
