import { Router } from 'express';
import auth from '../middleware/auth.js';
import { deleteComment } from '../controllers/commentController.js';

const router = Router();

// DELETE /api/comments/:id  (protected, author only)
router.delete('/:id', auth, deleteComment);

export default router;
