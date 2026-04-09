import mongoose from 'mongoose';

const watchedAreaSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    radius: { type: Number, required: true },
    areaName: { type: String },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    homeLocation: {
      lat: { type: Number },
      lng: { type: Number },
      areaName: { type: String },
    },
    watchedAreas: {
      type: [watchedAreaSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
