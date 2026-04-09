import { Router } from 'express';
import auth from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';
import {
  createPost,
  getNearbyPosts,
  getPostStats,
  getPostById,
  updatePost,
  deletePost,
  votePost,
  toggleResolved,
} from '../controllers/postController.js';
import {
  addComment,
  getComments,
} from '../controllers/commentController.js';

const router = Router();

// GET  /api/posts?lat=&lng=&radius=&category=&isResolved=
router.get('/', getNearbyPosts);

// GET  /api/posts/stats?division_id=&district_id=&upazila_id=&union_id=
router.get('/stats', getPostStats);

// POST /api/posts  (protected, supports up to 4 images)
router.post('/', auth, upload.array('images', 4), createPost);

// GET  /api/posts/:id
router.get('/:id', getPostById);

// PATCH /api/posts/:id  (protected, author only)
router.patch('/:id', auth, updatePost);

// DELETE /api/posts/:id  (protected, author only)
router.delete('/:id', auth, deletePost);

// POST /api/posts/:id/vote  (protected)
router.post('/:id/vote', auth, votePost);

// PATCH /api/posts/:id/resolve  (protected, author only)
router.patch('/:id/resolve', auth, toggleResolved);

// ── Comment sub-routes ────────────────────────────────────────────────────
// GET  /api/posts/:id/comments  (public)
router.get('/:id/comments', getComments);

// POST /api/posts/:id/comments  (protected)
router.post('/:id/comments', auth, addComment);

export default router;
