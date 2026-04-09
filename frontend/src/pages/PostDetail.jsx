import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from 'react-leaflet';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import {
  getPostById,
  votePost,
  toggleResolved,
  getComments,
  addComment,
  deleteComment,
} from '../api/posts.js';
import { getBreadcrumb } from '../utils/bdLocation.js';
import useAuthStore from '../store/authStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS = { Info: '#3b82f6', Caution: '#f97316', Urgent: '#ef4444' };
const CATEGORY_ICONS = {
  Safety:'🚨', Food:'🍽️', Transport:'🚌',
  Event:'📅', Warning:'⚠️', Tip:'💡', General:'📌',
};

// ─── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="pd-lightbox-overlay" onClick={onClose}>
      <button className="pd-lightbox-close" onClick={onClose}>✕</button>
      <img
        src={src}
        alt="Enlarged"
        className="pd-lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Avatar placeholder ────────────────────────────────────────────────────────

function Avatar({ user, size = 36 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="pd-avatar"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : '?';
  return (
    <div
      className="pd-avatar pd-avatar-placeholder"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </div>
  );
}

// ─── PostDetailPage ────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [post, setPost]                   = useState(null);
  const [comments, setComments]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [lightbox, setLightbox]           = useState(null); // image src or null
  const [bookmarked, setBookmarked]       = useState(false);
  const [newComment, setNewComment]       = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [voteLoading, setVoteLoading]     = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  const commentInputRef = useRef(null);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [postRes, commentsRes] = await Promise.all([
          getPostById(id),
          getComments(id),
        ]);
        if (!cancelled) {
          setPost(postRes.data);
          setComments(commentsRes.data);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load post.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Vote ─────────────────────────────────────────────────────────────────────
  const handleVote = async (voteType) => {
    if (!isAuthenticated) { toast.error('Log in to vote'); return; }
    if (voteLoading) return;
    setVoteLoading(true);
    try {
      const { data } = await votePost(id, voteType);
      setPost((p) => ({ ...p, upvotes: data.upvotes, downvotes: data.downvotes }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    } finally {
      setVoteLoading(false);
    }
  };

  // ── Toggle resolved ──────────────────────────────────────────────────────────
  const handleToggleResolved = async () => {
    if (resolveLoading) return;
    setResolveLoading(true);
    try {
      const { data } = await toggleResolved(id);
      setPost((p) => ({ ...p, isResolved: data.isResolved }));
      toast.success(data.isResolved ? 'Marked as resolved' : 'Marked as unresolved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    } finally {
      setResolveLoading(false);
    }
  };

  // ── Submit comment ───────────────────────────────────────────────────────────
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      const { data } = await addComment(id, text);
      setComments((prev) => [...prev, data]);
      setNewComment('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ── Delete comment ───────────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete comment');
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const isAuthor = post && user && post.author?._id === user._id;
  const hasUpvoted   = post && user && post.upvotes?.includes(user._id);
  const hasDownvoted = post && user && post.downvotes?.includes(user._id);
  const crumb = post
    ? getBreadcrumb(post.division_id, post.district_id, post.upazila_id)
    : null;

  let mapCoords = null;
  if (post?.location?.coordinates) {
    const [lng, lat] = post.location.coordinates;
    mapCoords = { lat, lng };
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner" />
        <p>Loading post…</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pd-error-state">
        <p>{error || 'Post not found.'}</p>
        <Link to="/map" className="btn-primary">← Back to Map</Link>
      </div>
    );
  }

  const sevColor = SEVERITY_COLORS[post.severityLevel] ?? '#6b7280';

  return (
    <div className="pd-page">

      {/* Lightbox */}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <div className="pd-container">

        {/* ── Back button ──────────────────────────────────────────────────── */}
        <button className="pd-back-btn" onClick={() => navigate('/map')}>
          ← Back to Map
        </button>

        {/* ── URGENT banner ────────────────────────────────────────────────── */}
        {post.severityLevel === 'Urgent' && (
          <div className="pd-urgent-banner">
            ⚠ URGENT — This post requires immediate attention
          </div>
        )}

        {/* ── Resolved banner ──────────────────────────────────────────────── */}
        {post.isResolved && (
          <div className="pd-resolved-banner">
            ✅ This issue has been resolved
          </div>
        )}

        {/* ══════════════════ TOP SECTION ══════════════════════════════════ */}
        <div className="pd-top">

          {/* Title */}
          <h1 className="pd-title">{post.title}</h1>

          {/* Author row */}
          <div className="pd-author-row">
            <Avatar user={post.author} size={40} />
            <div className="pd-author-info">
              <span className="pd-author-name">{post.author?.name ?? 'Unknown'}</span>
              <span className="pd-time">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Badges */}
          <div className="pd-badges">
            <span className="badge badge-category">
              {CATEGORY_ICONS[post.category] || ''} {post.category}
            </span>
            <span
              className="badge badge-severity"
              style={{ background: sevColor }}
            >
              {post.severityLevel}
            </span>
          </div>

          {/* Location line */}
          {(post.areaName || post.city || crumb?.label) && (
            <div className="pd-location">
              <span className="pd-location-icon">📍</span>
              <span>
                {[crumb?.label || post.areaName, post.city, post.country]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* ══════════════════ BODY ═════════════════════════════════════════ */}
        <div className="pd-body">
          <p className="pd-body-text">{post.body}</p>
        </div>

        {/* ══════════════════ IMAGE GALLERY ════════════════════════════════ */}
        {post.images?.length > 0 && (
          <div className="pd-gallery">
            {post.images.map((src, i) => (
              <button
                key={i}
                className="pd-gallery-item"
                onClick={() => setLightbox(src)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt={`Image ${i + 1}`} />
                <span className="pd-gallery-zoom">🔍</span>
              </button>
            ))}
          </div>
        )}

        {/* ══════════════════ MAP ══════════════════════════════════════════ */}
        {mapCoords && (
          <div className="pd-map-wrap">
            <MapContainer
              center={[mapCoords.lat, mapCoords.lng]}
              zoom={15}
              className="pd-mini-map"
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              touchZoom={false}
              keyboard={false}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CircleMarker
                center={[mapCoords.lat, mapCoords.lng]}
                radius={12}
                pathOptions={{ color: sevColor, fillColor: sevColor, fillOpacity: 0.9, weight: 2 }}
              >
                <Popup>{post.title}</Popup>
              </CircleMarker>
            </MapContainer>
          </div>
        )}

        {/* ══════════════════ INTERACTION BAR ══════════════════════════════ */}
        <div className="pd-interaction-bar">

          {/* Vote buttons */}
          <div className="pd-vote-group">
            <button
              className={`pd-vote-btn pd-upvote${hasUpvoted ? ' active' : ''}`}
              onClick={() => handleVote('up')}
              disabled={voteLoading}
              title="Upvote"
            >
              ▲ <span>{post.upvotes?.length ?? 0}</span>
            </button>
            <button
              className={`pd-vote-btn pd-downvote${hasDownvoted ? ' active' : ''}`}
              onClick={() => handleVote('down')}
              disabled={voteLoading}
              title="Downvote"
            >
              ▼ <span>{post.downvotes?.length ?? 0}</span>
            </button>
          </div>

          {/* Bookmark */}
          <button
            className={`pd-bookmark-btn${bookmarked ? ' active' : ''}`}
            onClick={() => {
              setBookmarked((b) => !b);
              toast.success(bookmarked ? 'Removed from bookmarks' : 'Bookmarked!');
            }}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {bookmarked ? '🔖 Saved' : '🔖 Save'}
          </button>

          {/* Mark resolved — author only */}
          {isAuthor && (
            <button
              className={`pd-resolve-btn${post.isResolved ? ' resolved' : ''}`}
              onClick={handleToggleResolved}
              disabled={resolveLoading}
            >
              {resolveLoading
                ? '…'
                : post.isResolved
                  ? '↩ Mark Unresolved'
                  : '✓ Mark as Resolved'}
            </button>
          )}
        </div>

        {/* ══════════════════ COMMENTS ═════════════════════════════════════ */}
        <section className="pd-comments">
          <h2 className="pd-comments-title">
            Comments <span className="pd-comment-count">{comments.length}</span>
          </h2>

          {/* Comment list */}
          {comments.length === 0 ? (
            <p className="pd-no-comments">No comments yet. Be the first!</p>
          ) : (
            <ul className="pd-comment-list">
              {comments.map((comment) => {
                const isCommentAuthor = user && comment.author?._id === user._id;
                return (
                  <li key={comment._id} className="pd-comment">
                    <Avatar user={comment.author} size={34} />
                    <div className="pd-comment-body">
                      <div className="pd-comment-header">
                        <span className="pd-comment-author">{comment.author?.name ?? 'User'}</span>
                        <span className="pd-comment-time">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                        {isCommentAuthor && (
                          <button
                            className="pd-comment-delete"
                            onClick={() => handleDeleteComment(comment._id)}
                            title="Delete comment"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                      <p className="pd-comment-text">{comment.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Add comment (logged in only) */}
          {isAuthenticated ? (
            <form className="pd-comment-form" onSubmit={handleCommentSubmit}>
              <Avatar user={user} size={34} />
              <div className="pd-comment-input-wrap">
                <textarea
                  ref={commentInputRef}
                  className="pd-comment-input"
                  rows={2}
                  placeholder="Write a comment…"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCommentSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="pd-comment-submit btn-primary"
                  disabled={commentSubmitting || !newComment.trim()}
                >
                  {commentSubmitting ? '…' : 'Post'}
                </button>
              </div>
            </form>
          ) : (
            <p className="pd-login-prompt">
              <Link to="/login">Log in</Link> to leave a comment.
            </p>
          )}
        </section>

      </div>
    </div>
  );
}
