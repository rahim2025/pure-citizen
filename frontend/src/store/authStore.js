import { create } from 'zustand';
import { loginUser, registerUser, getMe } from '../api/auth.js';

const TOKEN_KEY = 'lp_token';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  isAuthenticated: false,
  loading: false,
  error: null,

  /**
   * Log in with email + password.
   * Saves token to localStorage and updates store state.
   */
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const { data } = await loginUser(credentials);
      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      const message =
        err.response?.data?.message || 'Login failed. Please try again.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  /**
   * Register a new account.
   * Saves token to localStorage and updates store state.
   */
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await registerUser(userData);
      localStorage.setItem(TOKEN_KEY, data.token);
      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        loading: false,
      });
    } catch (err) {
      const message =
        err.response?.data?.message || 'Registration failed. Please try again.';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  /**
   * Fetch the current user using the stored token.
   * Called on app mount to rehydrate auth state.
   */
  loadUser: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await getMe();
      set({
        user: data.user,
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },

  /**
   * Clear auth state and remove token from localStorage.
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
