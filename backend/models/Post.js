import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    body: {
      type: String,
      required: true,
      minLength: 20,
    },
    category: {
      type: String,
      enum: ['Safety', 'Food', 'Transport', 'Event', 'Warning', 'Tip', 'Infrastructure', 'General'],
      required: true,
    },
    severityLevel: {
      type: String,
      enum: ['Info', 'Caution', 'Urgent'],
      default: 'Info',
    },

    // BD Location Hierarchy (structured)
    division: {
      id: String,
      name: String,
      lat: Number,
      lng: Number,
    },
    district: {
      id: String,
      name: String,
      lat: Number,
      lng: Number,
    },
    upazila: {
      id: String,
      name: String,
    },
    union: {
      id: String,
      name: String,
    },
    landmark: {
      type: String,
      trim: true,
      maxLength: 100,
    },
    displayLabel: {
      type: String,
    },

    // GeoJSON for map queries
    location: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number], // [longitude, latitude]
    },

    images: {
      type: [String],
      default: [],
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isResolved: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
postSchema.index({ location: '2dsphere' });
postSchema.index({ 'district.id': 1 });
postSchema.index({ 'upazila.id': 1 });
postSchema.index({ 'division.id': 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

export default Post;
