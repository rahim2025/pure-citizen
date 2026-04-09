import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  addWatchedArea,
  removeWatchedArea,
} from '../controllers/userController.js';
import auth, { protect } from '../middleware/auth.js';
import { upload } from '../config/cloudinary.js';

const router = Router();

// GET /api/users/:id  — public (but optionally auth-enriched)
router.get('/:id', protect({ optional: true }), getUserProfile);

// PATCH /api/users/:id  — protected, own user, optional avatar upload
router.patch('/:id', auth, upload.single('avatar'), updateUserProfile);

// Watched areas
router.post('/:id/watched-areas', auth, addWatchedArea);
router.delete('/:id/watched-areas/:index', auth, removeWatchedArea);

export default router;
