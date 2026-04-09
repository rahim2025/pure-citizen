import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore.js';

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="navbar-logo">
        LocalPulse
      </Link>

      {/* Actions */}
      <div className="navbar-actions">
        {isAuthenticated ? (
          <>
            <Link to="/create" className="btn-primary">
              + Create Post
            </Link>

            <Link
              to={`/profile/${user?._id}`}
              className="navbar-avatar"
              title={user?.name}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span className="avatar-placeholder">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout}
              className="btn-ghost"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost">
              Login
            </Link>
            <Link to="/register" className="btn-primary">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
