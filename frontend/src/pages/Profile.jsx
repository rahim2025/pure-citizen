import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import useAuthStore from '../store/authStore.js';
import {
  getUserProfile,
  updateUserProfile,
  addWatchedArea,
  removeWatchedArea,
} from '../api/users.js';
import { SEVERITY_COLORS, CATEGORY_ICONS as CAT_ICONS } from '../utils/postConstants.js';

const RADIUS_OPTIONS = [500, 1000, 2000, 5000, 10000];

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ user, size = 80, onClick, editable }) {
  const content = user?.avatar ? (
    <img
      src={user.avatar}
      alt={user?.name}
      className="prof-avatar-img"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="prof-avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {user?.name?.charAt(0).toUpperCase() ?? '?'}
    </div>
  );

  if (!editable) return <div className="prof-avatar-wrap">{content}</div>;

  return (
    <button className="prof-avatar-wrap prof-avatar-edit" onClick={onClick} title="Change avatar">
      {content}
      <span className="prof-avatar-badge">✏️</span>
    </button>
  );
}

// ─── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post }) {
  const sevColor = SEVERITY_COLORS[post.severityLevel] ?? '#6b7280';
  return (
    <Link to={`/post/${post._id}`} className="prof-post-card">
      <div className="prof-card-header">
        <span className="badge badge-category">
          {CAT_ICONS[post.category] || ''} {post.category}
        </span>
        <span className="badge badge-severity" style={{ background: sevColor }}>
          {post.severityLevel}
        </span>
        {post.isResolved && <span className="badge badge-resolved">✓</span>}
      </div>
      <h4 className="prof-card-title">{post.title}</h4>
      {post.areaName && <p className="prof-card-area">📍 {post.areaName}</p>}
      <p className="prof-card-meta">
        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
        {' · '}▲ {post.upvotes?.length ?? 0}
      </p>
    </Link>
  );
}

// ─── MapClickHandler (inside MapContainer) ────────────────────────────────────

function MapClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// ─── WatchAreaModal ────────────────────────────────────────────────────────────

function WatchAreaModal({ onClose, onSave }) {
  const [pin, setPin]         = useState(null); // { lat, lng }
  const [areaName, setAreaName] = useState('');
  const [radius, setRadius]   = useState(2000);
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!pin) { toast.error('Click the map to pick a location'); return; }
    setSaving(true);
    try {
      await onSave({ lat: pin.lat, lng: pin.lng, radius, areaName });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Watch New Area</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-hint">Click anywhere on the map to pin a location.</p>

        <div className="wa-map-wrap">
          <MapContainer
            center={[23.8103, 90.4125]}
            zoom={10}
            className="wa-map"
            zoomControl
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler onPick={setPin} />
            {pin && (
              <>
                <CircleMarker
                  center={[pin.lat, pin.lng]}
                  radius={10}
                  pathOptions={{ color:'#2563eb', fillColor:'#2563eb', fillOpacity: 0.85 }}
                />
                <Circle
                  center={[pin.lat, pin.lng]}
                  radius={radius}
                  pathOptions={{ color:'#2563eb', fillColor:'#2563eb', fillOpacity: 0.08, dashArray:'6 4' }}
                />
              </>
            )}
          </MapContainer>
        </div>

        <div className="modal-fields">
          <div className="form-group">
            <label>Area name (optional)</label>
            <input
              type="text"
              placeholder="e.g. Near work, Home neighbourhood"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Watch radius</label>
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !pin}>
            {saving ? 'Saving…' : 'Save Area'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditProfileModal ──────────────────────────────────────────────────────────

function EditProfileModal({ profileUser, onClose, onSaved }) {
  const [name, setName]       = useState(profileUser.name || '');
  const [bio, setBio]         = useState(profileUser.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(profileUser.avatar || '');
  const [saving, setSaving]   = useState(false);
  const fileRef               = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('bio', bio.trim());
      if (avatarFile) fd.append('avatar', avatarFile);
      const { data } = await updateUserProfile(profileUser._id, fd);
      onSaved(data);
      onClose();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Avatar picker */}
          <div className="ep-avatar-row">
            <div
              className="ep-avatar-preview"
              onClick={() => fileRef.current.click()}
              role="button"
              title="Click to change avatar"
            >
              {preview
                ? <img src={preview} alt="preview" />
                : <span>{name.charAt(0).toUpperCase() || '?'}</span>}
              <span className="ep-avatar-overlay">Change</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div className="modal-fields">
            <div className="form-group">
              <label>Display name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
                placeholder="Tell the community a little about yourself…"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated } = useAuthStore();

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState('posts');
  const [editModal, setEditModal]     = useState(false);
  const [watchModal, setWatchModal]   = useState(false);

  const isSelf = isAuthenticated && authUser?._id === id;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await getUserProfile(id);
        if (!cancelled) {
          setProfileUser(data.user);
          setPosts(data.posts);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'User not found.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── After edit saved ──────────────────────────────────────────────────────
  const handleProfileSaved = useCallback((updatedUser) => {
    setProfileUser((prev) => ({ ...prev, ...updatedUser }));
    // Also update auth store so Navbar shows fresh name/avatar
    useAuthStore.setState((s) => ({ user: { ...s.user, ...updatedUser } }));
  }, []);

  // ── Remove watched area ───────────────────────────────────────────────────
  const handleRemoveArea = useCallback(async (index) => {
    try {
      const { data } = await removeWatchedArea(id, index);
      setProfileUser((prev) => ({ ...prev, watchedAreas: data }));
      toast.success('Area removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove area');
    }
  }, [id]);

  // ── Add watched area ──────────────────────────────────────────────────────
  const handleAddArea = useCallback(async (areaData) => {
    const { data } = await addWatchedArea(id, areaData);
    setProfileUser((prev) => ({ ...prev, watchedAreas: data }));
    toast.success('Area added!');
  }, [id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalUpvotes = posts.reduce((sum, p) => sum + (p.upvotes?.length ?? 0), 0);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="pd-error-state">
        <p>{error || 'User not found.'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    );
  }

  return (
    <div className="prof-page">

      {/* Modals */}
      {editModal && (
        <EditProfileModal
          profileUser={profileUser}
          onClose={() => setEditModal(false)}
          onSaved={handleProfileSaved}
        />
      )}
      {watchModal && (
        <WatchAreaModal
          onClose={() => setWatchModal(false)}
          onSave={handleAddArea}
        />
      )}

      <div className="prof-container">

        {/* ══════════ PROFILE HEADER ═══════════════════════════════════════ */}
        <div className="prof-header-card">
          <Avatar
            user={profileUser}
            size={96}
            editable={isSelf}
            onClick={() => setEditModal(true)}
          />

          <div className="prof-info">
            <div className="prof-name-row">
              <h1 className="prof-name">{profileUser.name}</h1>
              {isSelf && (
                <button className="prof-edit-btn" onClick={() => setEditModal(true)}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {profileUser.bio && (
              <p className="prof-bio">{profileUser.bio}</p>
            )}

            {profileUser.homeLocation?.areaName && (
              <p className="prof-home">
                📍 {profileUser.homeLocation.areaName}
              </p>
            )}

            {/* Stats row */}
            <div className="prof-stats">
              <div className="prof-stat">
                <span className="prof-stat-value">{posts.length}</span>
                <span className="prof-stat-label">Posts</span>
              </div>
              <div className="prof-stat-divider" />
              <div className="prof-stat">
                <span className="prof-stat-value">{totalUpvotes}</span>
                <span className="prof-stat-label">Upvotes Received</span>
              </div>
              {isSelf && (
                <>
                  <div className="prof-stat-divider" />
                  <div className="prof-stat">
                    <span className="prof-stat-value">{profileUser.watchedAreas?.length ?? 0}</span>
                    <span className="prof-stat-label">Watched Areas</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════════ TABS ═════════════════════════════════════════════════ */}
        <div className="prof-tabs">
          <button
            className={`prof-tab${activeTab === 'posts' ? ' active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts ({posts.length})
          </button>
          {isSelf && (
            <button
              className={`prof-tab${activeTab === 'watched' ? ' active' : ''}`}
              onClick={() => setActiveTab('watched')}
            >
              Watched Areas ({profileUser.watchedAreas?.length ?? 0})
            </button>
          )}
        </div>

        {/* ══════════ MY POSTS TAB ═════════════════════════════════════════ */}
        {activeTab === 'posts' && (
          <div className="prof-tab-content">
            {posts.length === 0 ? (
              <div className="prof-empty">
                <p>No posts yet.</p>
                {isSelf && (
                  <Link to="/create" className="btn-primary">Create your first post</Link>
                )}
              </div>
            ) : (
              <div className="prof-post-grid">
                {posts.map((post) => <PostCard key={post._id} post={post} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════ WATCHED AREAS TAB ════════════════════════════════════ */}
        {activeTab === 'watched' && isSelf && (
          <div className="prof-tab-content">
            <div className="wa-list-header">
              <p className="wa-hint">
                You'll be able to filter the map feed by these areas.
              </p>
              <button className="btn-primary wa-add-btn" onClick={() => setWatchModal(true)}>
                + Watch New Area
              </button>
            </div>

            {!profileUser.watchedAreas?.length ? (
              <div className="prof-empty">
                <p>You haven't added any watched areas yet.</p>
              </div>
            ) : (
              <ul className="wa-list">
                {profileUser.watchedAreas.map((area, idx) => (
                  <li key={idx} className="wa-item">
                    <div className="wa-item-info">
                      <span className="wa-item-name">
                        📍 {area.areaName || `Area ${idx + 1}`}
                      </span>
                      <span className="wa-item-radius">
                        Radius: {area.radius >= 1000 ? `${area.radius / 1000} km` : `${area.radius} m`}
                      </span>
                      <span className="wa-item-coords">
                        {area.lat.toFixed(4)}, {area.lng.toFixed(4)}
                      </span>
                    </div>
                    <button
                      className="wa-remove-btn"
                      onClick={() => handleRemoveArea(idx)}
                      title="Remove area"
                    >
                      🗑 Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
