import User from '../models/User.js';
import Post from '../models/Post.js';
import cloudinary from '../config/cloudinary.js';

// ─── helpers ────────────────────────────────────────────────────────────────

const PUBLIC_FIELDS = '-password -email'; // never expose these to other users

// ─── getUserProfile ──────────────────────────────────────────────────────────
// GET /api/users/:id
// Returns public user info + all their posts.
// If the requester is the same user the email is also returned.
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select(PUBLIC_FIELDS).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Include email only for the user themselves (token attached by auth middleware
    // but this route is public so req.user may be undefined)
    const isSelf = req.user && req.user._id.toString() === id;
    if (isSelf) {
      // Re-fetch with email
      const fullUser = await User.findById(id).select('-password').lean();
      Object.assign(user, { email: fullUser.email, watchedAreas: fullUser.watchedAreas });
    }

    const posts = await Post.find({ author: id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ user, posts });
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── updateUserProfile ───────────────────────────────────────────────────────
// PATCH /api/users/:id  (protected — own user only)
// Accepts: name, bio  (multipart via multer for avatar upload)
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Not authorised to edit this profile' });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name  !== undefined) user.name  = req.body.name.trim();
    if (req.body.bio   !== undefined) user.bio   = req.body.bio.trim();

    // Avatar upload — multer puts the Cloudinary URL in req.file.path
    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (user.avatar) {
        try {
          const parts = user.avatar.split('/');
          const filenameWithExt = parts[parts.length - 1];
          const publicId = `localpulse/${filenameWithExt.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch { /* ignore cleanup errors */ }
      }
      user.avatar = req.file.path;
    }

    await user.save();

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      bio: user.bio,
      avatar: user.avatar,
      email: user.email,
      homeLocation: user.homeLocation,
      watchedAreas: user.watchedAreas,
    });
  } catch (err) {
    console.error('updateUserProfile error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── addWatchedArea ──────────────────────────────────────────────────────────
// POST /api/users/:id/watched-areas  (protected)
export const addWatchedArea = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id)
      return res.status(403).json({ message: 'Not authorised' });

    const { lat, lng, radius, areaName } = req.body;
    if (lat == null || lng == null || !radius)
      return res.status(400).json({ message: 'lat, lng and radius are required' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.watchedAreas.push({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: parseInt(radius, 10),
      areaName: areaName || '',
    });

    await user.save();
    return res.status(201).json(user.watchedAreas);
  } catch (err) {
    console.error('addWatchedArea error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── removeWatchedArea ───────────────────────────────────────────────────────
// DELETE /api/users/:id/watched-areas/:index  (protected)
export const removeWatchedArea = async (req, res) => {
  try {
    const { id, index } = req.params;
    if (req.user._id.toString() !== id)
      return res.status(403).json({ message: 'Not authorised' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const idx = parseInt(index, 10);
    if (idx < 0 || idx >= user.watchedAreas.length)
      return res.status(400).json({ message: 'Invalid area index' });

    user.watchedAreas.splice(idx, 1);
    await user.save();
    return res.status(200).json(user.watchedAreas);
  } catch (err) {
    console.error('removeWatchedArea error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
