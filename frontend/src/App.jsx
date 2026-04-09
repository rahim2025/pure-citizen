import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore.js';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MapFeedPage from './pages/MapFeedPage.jsx';
import PostDetail from './pages/PostDetail.jsx';
import CreatePost from './pages/CreatePost.jsx';
import Profile from './pages/Profile.jsx';

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);

  // Rehydrate auth state from stored token on every app mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/map" element={<MapFeedPage />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/profile/:id" element={<Profile />} />

        {/* Protected */}
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
