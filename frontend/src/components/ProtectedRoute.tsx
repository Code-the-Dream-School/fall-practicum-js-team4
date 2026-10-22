import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/useAuth';

// Wrap routes that need a signed-in user. Signed-out visitors go to /login,
// which sends them back here after signing in.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <p className="page-status" role="status">
        Checking your session…
      </p>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
