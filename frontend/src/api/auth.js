import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api/auth`,
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Register a new user
 * @param {{ name: string, email: string, password: string }} data
 */
export const registerUser = (data) => api.post('/register', data);

/**
 * Login an existing user
 * @param {{ email: string, password: string }} data
 */
export const loginUser = (data) => api.post('/login', data);

/**
 * Fetch the currently authenticated user
 */
export const getMe = () => api.get('/me');
