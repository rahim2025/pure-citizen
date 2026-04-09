import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BDLocationSelector from '../components/BDLocationSelector';
import { CATEGORY_ICONS, SEVERITIES, SEVERITY_COLORS } from '../utils/postConstants';
import { createPost } from '../api/posts';
import useAuthStore from '../store/authStore';

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      body: '',
      category: '',
      severityLevel: 'Info',
      tags: '',
    },
  });

  const [locationData, setLocationData] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Watch form fields for character counts
  const titleValue = watch('title');
  const bodyValue = watch('body');
  const tagsValue = watch('tags');

  // Redirect if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length + images.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = [];
    const validPreviews = [];

    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, WEBP allowed`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 5MB)`);
        continue;
      }

      validFiles.push(file);
      validPreviews.push({
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
      });
    }

    setImages([...images, ...validFiles]);
    setImagePreviews([...imagePreviews, ...validPreviews]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(imagePreviews[index].url);
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const onSubmit = async (formData) => {
    // Validate location
    if (!locationData?.district) {
      setLocationError('Please select at least Division and District');
      toast.error('Location is required');
      return;
    }
    setLocationError('');

    // Validate title and body
    if (formData.title.trim().length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }

    if (formData.body.trim().length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    // Build FormData for multipart upload
    const form = new FormData();
    form.append('title', formData.title.trim());
    form.append('body', formData.body.trim());
    form.append('category', formData.category);
    form.append('severityLevel', formData.severityLevel);
    form.append('division', JSON.stringify(locationData.division || {}));
    form.append('district', JSON.stringify(locationData.district || {}));
    form.append('upazila', JSON.stringify(locationData.upazila || {}));
    form.append('union', JSON.stringify(locationData.union || {}));
    form.append('landmark', locationData.landmark || '');
    form.append('displayLabel', locationData.displayLabel || '');
    form.append('lat', locationData.lat || '');
    form.append('lng', locationData.lng || '');
    form.append('tags', formData.tags || '');

    // Append images
    images.forEach((img) => form.append('images', img));

    setIsSubmitting(true);

    try {
      const res = await createPost(form);
      toast.success('✅ Post created successfully!');
      navigate(`/post/${res.data._id}`);
    } catch (err) {
      console.error('Create post error:', err);
      toast.error(err.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Parse tags for display
  const tagsList = tagsValue
    ? tagsValue
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 5)
    : [];

  return (
    <main className="create-post-page">
      {isSubmitting && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{images.length > 0 ? 'Uploading images... this may take a moment' : 'Uploading your post...'}</p>
        </div>
      )}

      <div className="page-header">
        <h1>Create New Post</h1>
        <p className="subtitle">Share information about an incident in your area</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="create-post-layout">
          {/* LEFT COLUMN */}
          <div className="left-column">
            {/* Title */}
            <div className="form-group">
              <label>
                Title <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="What happened? Write a clear, brief title"
                maxLength={150}
                {...register('title', { required: true, minLength: 10 })}
              />
              <div className="char-count">
                {titleValue?.length || 0}/150
                {errors.title && <span className="error-text"> (min 10 characters)</span>}
              </div>
            </div>

            {/* Category */}
            <div className="form-group">
              <label>
                Category <span className="required">*</span>
              </label>
              <div className="category-grid">
                {Object.keys(CATEGORY_ICONS).map((cat) => (
                  <label
                    key={cat}
                    className={`category-card ${watch('category') === cat ? 'selected' : ''}`}
                  >
                    <input type="radio" value={cat} {...register('category', { required: true })} />
                    <span className="category-icon">{CATEGORY_ICONS[cat]}</span>
                    <span className="category-name">{cat}</span>
                  </label>
                ))}
              </div>
              {errors.category && <div className="error-text">Please select a category</div>}
            </div>

            {/* Severity Level */}
            <div className="form-group">
              <label>Severity Level</label>
              <div className="severity-options">
                {SEVERITIES.map((sev) => (
                  <label
                    key={sev}
                    className={`severity-option ${watch('severityLevel') === sev ? 'selected' : ''}`}
                    style={{
                      '--severity-color': SEVERITY_COLORS[sev],
                    }}
                  >
                    <input type="radio" value={sev} {...register('severityLevel')} />
                    <span className="severity-dot"></span>
                    <span className="severity-label">{sev}</span>
                  </label>
                ))}
              </div>
              <div className="severity-tooltips">
                <small>
                  <strong>Info:</strong> General information, no immediate danger •{' '}
                  <strong>Caution:</strong> Be careful, situation needs attention •{' '}
                  <strong>Urgent:</strong> Immediate danger or critical issue
                </small>
              </div>
            </div>

            {/* Body */}
            <div className="form-group">
              <label>
                Description <span className="required">*</span>
              </label>
              <textarea
                rows={8}
                placeholder="Describe the incident in detail. Include what happened, when it happened, who is affected, and any helpful advice for others..."
                {...register('body', { required: true, minLength: 20 })}
              />
              <div className="char-count">
                {bodyValue?.length || 0} characters
                {errors.body && <span className="error-text"> (min 20 characters)</span>}
              </div>
            </div>

            {/* Tags */}
            <div className="form-group">
              <label>
                Tags <span className="optional">(Optional, max 5)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. flood, traffic, robbery (comma separated)"
                {...register('tags')}
              />
              {tagsList.length > 0 && (
                <div className="tags-preview">
                  {tagsList.map((tag, i) => (
                    <span key={i} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                  {tagsList.length >= 5 && <small className="error-text">Maximum 5 tags</small>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="right-column">
            {/* Location Selector */}
            <BDLocationSelector value={locationData} onChange={setLocationData} error={locationError} />

            {/* Image Upload */}
            <div className="form-group image-upload-section">
              <label>
                Add Photos <span className="optional">(Optional, max 4)</span>
              </label>

              <div className="upload-zone">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= 4}
                  style={{ display: 'none' }}
                />
                <label htmlFor="image-upload" className="upload-label">
                  <div className="upload-prompt">
                    📷 Drag photos here or click to upload
                    <br />
                    <small>Supported: JPG, PNG, WEBP (max 5MB each)</small>
                  </div>
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="image-previews">
                  {imagePreviews.map((preview, i) => (
                    <div key={i} className="image-preview-card">
                      <img src={preview.url} alt={`Preview ${i + 1}`} />
                      <button type="button" className="btn-remove-image" onClick={() => removeImage(i)}>
                        ✕
                      </button>
                      <div className="image-info">
                        <small>{preview.name}</small>
                        <small>{preview.size}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="submit-actions">
          <button type="button" className="btn-secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-small"></span> Publishing...
              </>
            ) : (
              <>📤 Publish Post</>
            )}
          </button>
        </div>
      </form>
    </main>
  );
}
