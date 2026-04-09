import Post from '../models/Post.js';
import cloudinary from '../config/cloudinary.js';

// ─── helpers ───────────────────────────────────────────────────────────────

const populatedAuthor = 'name avatar';

// ─── createPost ────────────────────────────────────────────────────────────
// POST /api/posts  (protected, multipart/form-data via multer)
export const createPost = async (req, res) => {
  try {
    const {
      title,
      body,
      category,
      severityLevel,
      division,
      district,
      upazila,
      union,
      landmark,
      displayLabel,
      lat,
      lng,
      tags,
    } = req.body;

    // Validation
    if (!title || title.trim().length < 10) {
      return res.status(400).json({ message: 'Title is required and must be at least 10 characters' });
    }

    if (!body || body.trim().length < 20) {
      return res.status(400).json({ message: 'Body is required and must be at least 20 characters' });
    }

    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }

    // Parse JSON strings for location data
    let parsedDivision, parsedDistrict, parsedUpazila, parsedUnion;
    try {
      parsedDivision = division ? JSON.parse(division) : null;
      parsedDistrict = district ? JSON.parse(district) : null;
      parsedUpazila = upazila && upazila !== '{}' ? JSON.parse(upazila) : null;
      parsedUnion = union && union !== '{}' ? JSON.parse(union) : null;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid location data format' });
    }

    // District is minimum requirement
    if (!parsedDistrict || !parsedDistrict.id) {
      return res.status(400).json({ message: 'District is required' });
    }

    // Build location GeoJSON
    const longitude = lng ? parseFloat(lng) : parseFloat(parsedDistrict.lng);
    const latitude = lat ? parseFloat(lat) : parseFloat(parsedDistrict.lat);

    const location = {
      type: 'Point',
      coordinates: [longitude, latitude],
    };

    // Parse tags (comma-separated string to array)
    let parsedTags = [];
    if (tags && typeof tags === 'string') {
      parsedTags = tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
        .slice(0, 5); // max 5 tags
    }

    // Get uploaded image URLs from cloudinary
    const images = req.files ? req.files.map((f) => f.path) : [];

    const post = await Post.create({
      author: req.user._id,
      title: title.trim(),
      body: body.trim(),
      category,
      severityLevel: severityLevel || 'Info',
      division: parsedDivision,
      district: parsedDistrict,
      upazila: parsedUpazila,
      union: parsedUnion,
      landmark: landmark || '',
      displayLabel: displayLabel || '',
      location,
      images,
      tags: parsedTags,
    });

    await post.populate('author', populatedAuthor);
    return res.status(201).json(post);
  } catch (err) {
    console.error('createPost error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── getPostStats ───────────────────────────────────────────────────────────
// GET /api/posts/stats?division_id=&district_id=&upazila_id=&union_id=  (public)
export const getPostStats = async (req, res) => {
  try {
    const {
      division_id,
      district_id,
      upazila_id,
      union_id,
    } = req.query;

    const filter = {};

    // ── BD administrative filter (hierarchy: union > upazila > district > division) ──
    if (union_id) {
      filter['union.id'] = union_id;
    } else if (upazila_id) {
      filter['upazila.id'] = upazila_id;
    } else if (district_id) {
      filter['district.id'] = district_id;
    } else if (division_id) {
      filter['division.id'] = division_id;
    }

    const [total, urgent] = await Promise.all([
      Post.countDocuments(filter),
      Post.countDocuments({ ...filter, severityLevel: 'Urgent' }),
    ]);

    return res.status(200).json({
      total,
      urgent,
    });
  } catch (err) {
    console.error('getPostStats error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── getNearbyPosts ─────────────────────────────────────────────────────────
// GET /api/posts?lat=&lng=&radius=&category=&severityLevel=&isResolved=
//              &division_id=&district_id=&upazila_id=&union_id=&sortBy=&search=&page=&limit=   (public)
export const getNearbyPosts = async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 10000,
      category,
      severityLevel,
      isResolved,
      division_id,
      district_id,
      upazila_id,
      union_id,
      sortBy = 'newest',
      search,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    // ── BD administrative filter (hierarchy: union > upazila > district > division) ──
    if (union_id) {
      filter['union.id'] = union_id;
    } else if (upazila_id) {
      filter['upazila.id'] = upazila_id;
    } else if (district_id) {
      filter['district.id'] = district_id;
    } else if (division_id) {
      filter['division.id'] = division_id;
    }

    // ── Geospatial filter (only if no admin filter and lat/lng provided) ───
    if (!division_id && !district_id && !upazila_id && !union_id && lat && lng) {
      filter.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius, 10),
        },
      };
    }

    // ── Optional property filters ─────────────────────────────────────────
    if (category) filter.category = category;
    if (severityLevel) filter.severityLevel = severityLevel;
    if (isResolved !== undefined && isResolved !== '') {
      filter.isResolved = isResolved === 'true';
    }

    // ── Search filter (regex on title and body) ──────────────────────────
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { body: searchRegex }
      ];
    }

    // ── Sorting ───────────────────────────────────────────────────────────
    let sortOption = { createdAt: -1 }; // default: newest
    if (sortBy === 'mostVoted') {
      sortOption = { upvotes: -1, createdAt: -1 };
    } else if (sortBy === 'mostViewed') {
      sortOption = { viewCount: -1, createdAt: -1 };
    } else if (sortBy === 'urgentFirst') {
      // Urgent first, then by date
      sortOption = { severityLevel: 1, createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', populatedAuthor)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasMore = parseInt(page) < totalPages;

    return res.status(200).json({
      posts,
      total,
      page: parseInt(page),
      totalPages,
      hasMore,
    });
  } catch (err) {
    console.error('getNearbyPosts error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── getPostById ─────────────────────────────────────────────────────────────
// GET /api/posts/:id  (public)
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('author', populatedAuthor);

    if (!post) return res.status(404).json({ message: 'Post not found' });

    return res.status(200).json(post);
  } catch (err) {
    console.error('getPostById error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── updatePost ──────────────────────────────────────────────────────────────
// PATCH /api/posts/:id  (protected, author only)
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    // Fields that can be updated (location cannot be updated after posting)
    const allowed = ['title', 'body', 'category', 'severityLevel', 'tags', 'landmark'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    await post.save();
    await post.populate('author', populatedAuthor);
    return res.status(200).json(post);
  } catch (err) {
    console.error('updatePost error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── deletePost ──────────────────────────────────────────────────────────────
// DELETE /api/posts/:id  (protected, author only)
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    // Delete associated cloudinary images
    if (post.images && post.images.length > 0) {
      for (const imageUrl of post.images) {
        try {
          // Extract public_id from cloudinary URL
          // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.ext
          const parts = imageUrl.split('/');
          const fileWithExt = parts[parts.length - 1];
          const publicId = `localpulse/posts/${fileWithExt.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.error('Failed to delete image from cloudinary:', err.message);
        }
      }
    }

    await post.deleteOne();
    return res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    console.error('deletePost error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── votePost ────────────────────────────────────────────────────────────────
// POST /api/posts/:id/vote  (protected)
// body: { voteType: 'up' | 'down' }
export const votePost = async (req, res) => {
  try {
    const { voteType } = req.body;
    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ message: "voteType must be 'up' or 'down'" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user._id;
    const primaryArr   = voteType === 'up' ? 'upvotes'   : 'downvotes';
    const oppositeArr  = voteType === 'up' ? 'downvotes' : 'upvotes';

    const alreadyVoted = post[primaryArr].some((id) => id.equals(userId));

    // Always remove from opposite array if present
    post[oppositeArr] = post[oppositeArr].filter((id) => !id.equals(userId));

    if (alreadyVoted) {
      // Toggle off
      post[primaryArr] = post[primaryArr].filter((id) => !id.equals(userId));
    } else {
      post[primaryArr].push(userId);
    }

    await post.save();
    return res.status(200).json({
      upvotes: post.upvotes.length,
      downvotes: post.downvotes.length,
      userVote: alreadyVoted ? null : voteType,
    });
  } catch (err) {
    console.error('votePost error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── toggleResolved ──────────────────────────────────────────────────────────
// PATCH /api/posts/:id/resolve  (protected, author only)
export const toggleResolved = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    post.isResolved = !post.isResolved;
    await post.save();

    return res.status(200).json({ isResolved: post.isResolved });
  } catch (err) {
    console.error('toggleResolved error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
