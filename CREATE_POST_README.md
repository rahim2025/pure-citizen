# LocalPulse - Create Post Feature

## Overview
Complete implementation of the Create Post feature for LocalPulse, a Bangladesh location-based social media platform.

## Features Implemented

### Backend
- ✅ Enhanced Post model with BD location hierarchy (Division, District, Upazila, Union)
- ✅ GeoJSON coordinates for map queries with 2dsphere indexing
- ✅ Cloudinary integration with image optimization (max 4 images, 5MB each)
- ✅ Comprehensive post controller with CRUD operations
- ✅ Vote system (upvote/downvote)
- ✅ Post resolution toggle
- ✅ View count tracking
- ✅ Tags support (max 5 tags)
- ✅ Pagination support for post listing

### Frontend
- ✅ BDLocationSelector component with GPS auto-detection
- ✅ Cascading location dropdowns (Division → District → Upazila → Union)
- ✅ Reverse geocoding with Nominatim API
- ✅ CreatePostPage with react-hook-form validation
- ✅ Category selection with icon cards (8 categories)
- ✅ Severity level selection (Info, Caution, Urgent)
- ✅ Image upload with previews (drag & drop support)
- ✅ Tags input with live preview
- ✅ Mobile responsive design
- ✅ Loading states and error handling

## API Endpoints

### POST /api/posts
Create a new post (protected, requires authentication)

**Request Body (multipart/form-data):**
```
title: string (required, 10-150 chars)
body: string (required, min 20 chars)
category: string (required, enum)
severityLevel: string (Info|Caution|Urgent)
division: JSON string (required)
district: JSON string (required)
upazila: JSON string (optional)
union: JSON string (optional)
landmark: string (optional, max 100 chars)
displayLabel: string (generated)
lat: number (optional, uses district lat if not provided)
lng: number (optional, uses district lng if not provided)
tags: string (comma-separated, max 5 tags)
images: file[] (optional, max 4 images, 5MB each)
```

**Response:**
```json
{
  "_id": "...",
  "author": { "name": "...", "avatar": "..." },
  "title": "...",
  "body": "...",
  "category": "Safety",
  "severityLevel": "Info",
  "division": { "id": "6", "name": "Dhaka", "lat": 23.81, "lng": 90.41 },
  "district": { "id": "47", "name": "Dhaka", "lat": 23.8103, "lng": 90.4125 },
  "upazila": { "id": "...", "name": "..." },
  "union": { "id": "...", "name": "..." },
  "landmark": "Sector 7, Road 15",
  "displayLabel": "Sector 7, Road 15, Dhaka, Dhaka",
  "location": {
    "type": "Point",
    "coordinates": [90.4125, 23.8103]
  },
  "images": ["https://res.cloudinary.com/..."],
  "tags": ["traffic", "urgent"],
  "viewCount": 0,
  "upvotes": [],
  "downvotes": [],
  "isResolved": false,
  "createdAt": "2024-03-30T...",
  "updatedAt": "2024-03-30T..."
}
```

### GET /api/posts
Get nearby posts with optional filters

**Query Parameters:**
```
lat: number (optional)
lng: number (optional)
radius: number (default: 10000 meters)
category: string (optional)
severityLevel: string (optional)
isResolved: boolean (optional)
division_id: string (optional)
district_id: string (optional)
upazila_id: string (optional)
page: number (default: 1)
limit: number (default: 20)
```

**Response:**
```json
{
  "posts": [...],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### GET /api/posts/:id
Get post by ID (increments view count)

### PATCH /api/posts/:id
Update post (protected, author only)
- Can update: title, body, category, severityLevel, tags, landmark
- Cannot update: location (after posting)

### DELETE /api/posts/:id
Delete post and associated images (protected, author only)

### POST /api/posts/:id/vote
Vote on post (protected)
```json
{ "voteType": "up" | "down" }
```

### PATCH /api/posts/:id/resolve
Toggle post resolved status (protected, author only)

## Database Schema

```javascript
{
  author: ObjectId (ref: User, required),
  title: String (required, trim, maxLength: 150),
  body: String (required, minLength: 20),
  category: String (required, enum: [...]),
  severityLevel: String (enum: ['Info', 'Caution', 'Urgent'], default: 'Info'),

  // BD Location Hierarchy
  division: { id, name, lat, lng },
  district: { id, name, lat, lng },
  upazila: { id, name },
  union: { id, name },
  landmark: String (trim, maxLength: 100),
  displayLabel: String,

  // GeoJSON for map queries
  location: {
    type: 'Point',
    coordinates: [Number] // [lng, lat]
  },

  images: [String],
  upvotes: [ObjectId],
  downvotes: [ObjectId],
  isResolved: Boolean (default: false),
  tags: [String],
  viewCount: Number (default: 0),

  timestamps: true
}
```

**Indexes:**
- location: 2dsphere
- district.id: 1
- upazila.id: 1
- division.id: 1
- createdAt: -1

## Categories

1. 🚨 Safety
2. 🍽️ Food
3. 🚌 Transport
4. 🎉 Event
5. ⚠️ Warning
6. 💡 Tip
7. 🏗️ Infrastructure
8. 📋 General

## Severity Levels

- **Info** (🔵): General information, no immediate danger
- **Caution** (🟠): Be careful, situation needs attention
- **Urgent** (🔴): Immediate danger or critical issue

## BD Location Data

The application uses the Bangladesh administrative hierarchy:
- **Divisions**: 8 divisions (Dhaka, Chattagram, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh)
- **Districts**: 64 districts with lat/lng coordinates
- **Upazilas**: 492 upazilas
- **Unions**: Sample data included (expandable)

Location data files are stored in:
```
frontend/src/utils/bd/
  ├── divisions.json
  ├── districts.json
  ├── upazilas.json
  └── unions.json
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and Cloudinary credentials
```

4. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your backend API URL
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Navigate to `/create` route (protected, requires login)
2. Fill in the post title (min 10 characters)
3. Select a category
4. Choose severity level
5. Write description (min 20 characters)
6. Add tags (optional, max 5)
7. **Location Selection:**
   - Click "Use My Current Location" for GPS auto-detection, OR
   - Manually select: Division → District → Upazila → Union
   - Add specific landmark (optional)
8. Upload images (optional, max 4)
9. Click "Publish Post"

## Validation Rules

### Frontend
- Title: required, min 10, max 150 chars
- Body: required, min 20 chars
- Category: required
- Location: District is minimum requirement
- Images: max 4 files, max 5MB each, JPG/PNG/WEBP only
- Tags: max 5 tags

### Backend
- Same as frontend, plus JSON validation for location objects
- Cloudinary handles image upload and optimization

## Mobile Responsive

- Single column layout on mobile
- Fixed submit buttons at bottom
- Category grid changes to 2 columns
- Severity options stack vertically
- Touch-friendly UI elements

## Testing Checklist

- ✅ Create post with all required fields
- ✅ GPS location detection works
- ✅ Manual location selection cascades properly
- ✅ Image upload with previews
- ✅ Image removal works
- ✅ Form validation shows errors
- ✅ Post creation success redirects to post detail
- ✅ Images uploaded to Cloudinary
- ✅ Location coordinates saved correctly
- ✅ Tags parsed and stored
- ✅ Mobile layout works
- ✅ Loading state during upload

## Troubleshooting

### "Failed to create post"
- Check if backend is running
- Verify Cloudinary credentials
- Check MongoDB connection
- Ensure user is authenticated

### "Could not get location"
- Check browser location permissions
- Ensure HTTPS connection (required for geolocation API)
- Fallback to manual selection

### Images not uploading
- Check file size (max 5MB)
- Verify file type (JPG/PNG/WEBP only)
- Check Cloudinary configuration
- Ensure multer middleware is properly configured

## Future Enhancements

- [ ] Add more union data for all upazilas
- [ ] Implement image cropping before upload
- [ ] Add draft save functionality
- [ ] Implement post preview before publishing
- [ ] Add location search/autocomplete
- [ ] Implement post scheduling

## License

MIT
