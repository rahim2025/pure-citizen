import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** GET /api/posts?lat=&lng=&radius=&category=&isResolved=&division_id=&district_id=&upazila_id=&union_id=&sortBy=&search=&page=&limit= */
export const getPosts = (params) => api.get('/posts', { params });

/** GET /api/posts/stats?division_id=&district_id=&upazila_id=&union_id= */
export const getPostStats = (params) => api.get('/posts/stats', { params });

/** GET /api/posts?lat=&lng=&radius=&category=&isResolved= */
export const getNearbyPosts = (params) => api.get('/posts', { params });

/** GET /api/posts/:id */
export const getPostById = (id) => api.get(`/posts/${id}`);

/** POST /api/posts (multipart/form-data) */
export const createPost = (formData) =>
  api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

/** PATCH /api/posts/:id */
export const updatePost = (id, data) => api.patch(`/posts/${id}`, data);

/** DELETE /api/posts/:id */
export const deletePost = (id) => api.delete(`/posts/${id}`);

/** POST /api/posts/:id/vote  body: { voteType: 'up'|'down' } */
export const votePost = (id, voteType) => api.post(`/posts/${id}/vote`, { voteType });

/** PATCH /api/posts/:id/resolve */
export const toggleResolved = (id) => api.patch(`/posts/${id}/resolve`);

/** GET /api/posts/:id/comments */
export const getComments = (id) => api.get(`/posts/${id}/comments`);

/** POST /api/posts/:id/comments */
export const addComment = (id, text) => api.post(`/posts/${id}/comments`, { text });

/** DELETE /api/comments/:id */
export const deleteComment = (id) => api.delete(`/comments/${id}`);
