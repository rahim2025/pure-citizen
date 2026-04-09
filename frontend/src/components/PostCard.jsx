import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './PostCard.css';

export default function PostCard({ post }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/post/${post._id}`);
  };

  const getCategoryColor = (category) => {
    const colors = {
      Safety: '#ef4444',
      Food: '#f59e0b',
      Transport: '#3b82f6',
      Event: '#8b5cf6',
      Warning: '#dc2626',
      Tip: '#10b981',
      Infrastructure: '#6b7280',
      General: '#6366f1',
    };
    return colors[category] || '#6b7280';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      Info: '#3b82f6',
      Caution: '#f59e0b',
      Urgent: '#dc2626',
    };
    return colors[severity] || '#3b82f6';
  };

  const buildLocationBreadcrumb = () => {
    const parts = [];
    if (post.division?.name) parts.push(post.division.name);
    if (post.district?.name) parts.push(post.district.name);
    if (post.upazila?.name) parts.push(post.upazila.name);
    return parts.join(' › ');
  };

  const truncateBody = (text, lines = 3) => {
    const words = text.split(' ');
    const maxChars = lines * 60; // Approximate chars per line
    let result = '';
    let charCount = 0;
    
    for (const word of words) {
      if (charCount + word.length > maxChars) {
        result += '...';
        break;
      }
      result += word + ' ';
      charCount += word.length + 1;
    }
    
    return result.trim();
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : '';

  const upvoteCount = post.upvotes?.length || 0;
  const viewCount = post.viewCount || 0;

  return (
    <div className="post-card" onClick={handleClick}>
      <div className="post-card-header">
        <div className="post-badges">
          <span className="category-badge" style={{ backgroundColor: getCategoryColor(post.category) }}>
            {post.category}
          </span>
          <span className="severity-badge" style={{ backgroundColor: getSeverityColor(post.severityLevel) }}>
            {post.severityLevel}
          </span>
        </div>
        {post.isResolved && (
          <span className="resolved-badge">✓ Resolved</span>
        )}
      </div>

      <h3 className="post-title">{post.title}</h3>
      <p className="post-body-preview">{truncateBody(post.body)}</p>

      <div className="post-location">
        <span className="location-icon">📍</span>
        {buildLocationBreadcrumb()}
      </div>

      <div className="post-card-footer">
        <div className="post-author">
          {post.author?.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="author-avatar" />
          ) : (
            <div className="author-avatar-placeholder">
              {post.author?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <span className="author-name">{post.author?.name || 'Anonymous'}</span>
        </div>

        <div className="post-stats">
          <span className="stat-item">
            <span className="stat-icon">👍</span>
            {upvoteCount}
          </span>
          <span className="stat-item">
            <span className="stat-icon">👁</span>
            {viewCount}
          </span>
          <span className="stat-time">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
