import Comment from '../models/Comment.js';
import Post from '../models/Post.js';

// ─── addComment ──────────────────────────────────────────────────────────────
// POST /api/posts/:id/comments  (protected)
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.user._id,
      text: text.trim(),
    });

    await comment.populate('author', 'name avatar');
    return res.status(201).json(comment);
  } catch (err) {
    console.error('addComment error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── getComments ─────────────────────────────────────────────────────────────
// GET /api/posts/:id/comments  (public)
export const getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comments = await Comment.find({ post: post._id })
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json(comments);
  } catch (err) {
    console.error('getComments error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── deleteComment ────────────────────────────────────────────────────────────
// DELETE /api/comments/:id  (protected, author only)
export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    await comment.deleteOne();
    return res.status(200).json({ message: 'Comment deleted' });
  } catch (err) {
    console.error('deleteComment error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
