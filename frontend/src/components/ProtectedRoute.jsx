import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';

/**
 * Wraps a route and redirects to /login if the user is not authenticated.
 * Preserves the intended destination so it can redirect back after login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <div className="page-loading">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
