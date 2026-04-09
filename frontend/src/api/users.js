import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** GET /api/users/:id → { user, posts } */
export const getUserProfile = (id) => api.get(`/users/${id}`);

/** PATCH /api/users/:id — multipart/form-data  */
export const updateUserProfile = (id, formData) =>
  api.patch(`/users/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

/** POST /api/users/:id/watched-areas */
export const addWatchedArea = (id, data) => api.post(`/users/${id}/watched-areas`, data);

/** DELETE /api/users/:id/watched-areas/:index */
export const removeWatchedArea = (id, index) =>
  api.delete(`/users/${id}/watched-areas/${index}`);
