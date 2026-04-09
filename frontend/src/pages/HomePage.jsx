import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPosts, getPostStats } from '../api/posts';
import { getDivisions } from '../utils/bdLocation';
import useAuthStore from '../store/authStore';
import AreaSelector from '../components/AreaSelector';
import PostCard from '../components/PostCard';
import './HomePage.css';

const CATEGORIES = ['All', 'Safety', 'Food', 'Transport', 'Event', 'Warning', 'Tip', 'Infrastructure', 'General'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'mostVoted', label: 'Most Voted' },
  { value: 'mostViewed', label: 'Most Viewed' },
  { value: 'urgentFirst', label: 'Urgent First' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  // State
  const [selectedArea, setSelectedArea] = useState({});
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ total: 0, urgent: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  const divisions = getDivisions();

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (selectedArea.queryParams) {
      Object.assign(params, selectedArea.queryParams);
    }
    if (category !== 'All') params.category = category;
    if (sortBy !== 'newest') params.sortBy = sortBy;
    if (searchQuery) params.search = searchQuery;

    setSearchParams(params);
  }, [selectedArea, category, sortBy, searchQuery, setSearchParams]);

  // Fetch posts
  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const params = {
        ...selectedArea.queryParams,
        page: pageNum,
        limit: 12,
      };
      if (category !== 'All') params.category = category;
      if (sortBy) params.sortBy = sortBy;
      if (searchQuery) params.search = searchQuery;

      const response = await getPosts(params);
      const data = response.data;

      if (append) {
        setPosts((prev) => [...prev, ...data.posts]);
      } else {
        setPosts(data.posts);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedArea, category, sortBy, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!selectedArea.queryParams || Object.keys(selectedArea.queryParams).length === 0) {
      setStats({ total: 0, urgent: 0 });
      return;
    }

    try {
      const response = await getPostStats(selectedArea.queryParams);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [selectedArea]);

  // Re-fetch when filters change
  useEffect(() => {
    fetchPosts(1, false);
    fetchStats();
  }, [fetchPosts, fetchStats]);

  // Search debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      setSearchQuery(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleLoadMore = () => {
    fetchPosts(page + 1, true);
  };

  const handleDivisionQuickSelect = (division) => {
    setSelectedArea({
      division,
      district: null,
      upazila: null,
      union: null,
      queryParams: { division_id: division.id },
    });
  };

  const hasAreaSelected = selectedArea.queryParams && Object.keys(selectedArea.queryParams).length > 0;

  const getAreaName = () => {
    if (selectedArea.union) return selectedArea.union.name;
    if (selectedArea.upazila) return selectedArea.upazila.name;
    if (selectedArea.district) return selectedArea.district.name;
    if (selectedArea.division) return selectedArea.division.name;
    return 'Bangladesh';
  };

  return (
    <div className="homepage">
      <div className="homepage-container">
        <div className="sticky-header">
          <AreaSelector value={selectedArea} onChange={setSelectedArea} />
        </div>

        {!hasAreaSelected ? (
          <div className="division-grid">
            <h2 className="section-title">Explore by Division</h2>
            <div className="division-cards">
              {divisions.map((division) => (
                <div
                  key={division.id}
                  className="division-card"
                  onClick={() => handleDivisionQuickSelect(division)}
                >
                  <h3>{division.name}</h3>
                  <p>Browse posts in this division</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="area-stats">
              <h2 className="area-name">{getAreaName()}</h2>
              <div className="stats-row">
                <span className="stat-badge">
                  <strong>{stats.total}</strong> Total Posts
                </span>
                {stats.urgent > 0 && (
                  <span className="stat-badge urgent">
                    <strong>{stats.urgent}</strong> Urgent Alerts
                  </span>
                )}
              </div>
            </div>

            <div className="filters-section">
              <div className="category-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`category-pill ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="controls-row">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search posts..."
                  defaultValue={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
              </div>
            </div>

            {loading && page === 1 ? (
              <div className="posts-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <>
                <div className="posts-grid">
                  {posts.map((post) => (
                    <PostCard key={post._id} post={post} />
                  ))}
                </div>

                {hasMore && (
                  <div className="load-more-section">
                    <button onClick={handleLoadMore} className="load-more-btn" disabled={loading}>
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No posts yet</h3>
                <p>Be the first to post an incident in this area!</p>
              </div>
            )}
          </>
        )}
      </div>

      {user && (
        <button className="floating-post-btn" onClick={() => navigate('/create')}>
          <span className="btn-icon">✏️</span>
          <span className="btn-text">Post Incident</span>
        </button>
      )}
    </div>
  );
}
