import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { getNearbyPosts } from '../api/posts.js';
import {
  getDivisions,
  getDistrictsByDivision,
  getUpazilasByDistrict,
  getMapTarget,
  getBreadcrumb,
} from '../utils/bdLocation.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  Info: '#3b82f6',
  Caution: '#f97316',
  Urgent: '#ef4444',
};

const CATEGORY_ICONS = {
  Safety:    '🚨',
  Food:      '🍽️',
  Transport: '🚌',
  Event:     '📅',
  Warning:   '⚠️',
  Tip:       '💡',
  General:   '📌',
};

const RADIUS_OPTIONS = [
  { label: '1km',  value: 1000 },
  { label: '5km',  value: 5000 },
  { label: '10km', value: 10000 },
  { label: '25km', value: 25000 },
];

const CATEGORIES = ['Safety', 'Food', 'Transport', 'Event', 'Warning', 'Tip', 'General'];
const SEVERITIES = ['Info', 'Caution', 'Urgent'];

// Default center — Dhaka, Bangladesh
const DEFAULT_CENTER = { lat: 23.8103, lng: 90.4125 };

const ALL_DIVISIONS = getDivisions();

const getPostLocationIds = (post) => ({
  divisionId: post?.division?.id ?? post?.division_id ?? '',
  districtId: post?.district?.id ?? post?.district_id ?? '',
  upazilaId: post?.upazila?.id ?? post?.upazila_id ?? '',
});

// ─── MapController: flies the map whenever `flyTo` changes ───────────────────

function MapController({ flyTo }) {
  const map = useMap();

  useEffect(() => {
    if (!flyTo) return;
    map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 14, { duration: 1.2 });
  }, [flyTo, map]);

  return null;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function CategoryBadge({ category }) {
  return (
    <span className="badge badge-category">
      {CATEGORY_ICONS[category] || ''} {category}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return (
    <span
      className="badge badge-severity"
      style={{ background: SEVERITY_COLORS[severity] ?? '#6b7280' }}
    >
      {severity}
    </span>
  );
}

// ─── MapFeedPage ──────────────────────────────────────────────────────────────

export default function MapFeedPage() {
  const [center, setCenter]               = useState(DEFAULT_CENTER);
  const [radius, setRadius]               = useState(5000);
  const [posts, setPosts]                 = useState([]);
  const [postsLoading, setPostsLoading]   = useState(false);
  const [filters, setFilters]             = useState({ category: '', severityLevel: '', isResolved: '' });
  const [flyTo, setFlyTo]                 = useState(null);

  // Bangladesh location filter
  const [bdFilter, setBdFilter] = useState({ divisionId: '', districtId: '', upazilaId: '' });

  // Derived cascading lists
  const availableDistricts = bdFilter.divisionId
    ? getDistrictsByDivision(bdFilter.divisionId)
    : [];
  const availableUpazilas = bdFilter.districtId
    ? getUpazilasByDistrict(bdFilter.districtId)
    : [];

  // Search state
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);

  // ── Get user geolocation on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setCenter(loc);
        setFlyTo({ ...loc, zoom: 13 });
      },
      () => {}
    );
  }, []);

  // ── Fetch posts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true);
      try {
        const bdActive = bdFilter.divisionId || bdFilter.districtId || bdFilter.upazilaId;
        const params = {
          ...(bdActive
            ? {
                ...(bdFilter.upazilaId  && { upazila_id:  bdFilter.upazilaId }),
                ...(bdFilter.districtId && !bdFilter.upazilaId  && { district_id:  bdFilter.districtId }),
                ...(bdFilter.divisionId && !bdFilter.districtId && { division_id: bdFilter.divisionId }),
              }
            : {
                lat: center.lat,
                lng: center.lng,
                radius,
              }),
          ...(filters.category      && { category: filters.category }),
          ...(filters.severityLevel && { severityLevel: filters.severityLevel }),
          ...(filters.isResolved !== '' && { isResolved: filters.isResolved }),
        };
        const { data } = await getNearbyPosts(params);
        const normalizedPosts = Array.isArray(data) ? data : Array.isArray(data?.posts) ? data.posts : [];
        setPosts(normalizedPosts);
      } catch (err) {
        if (!axios.isCancel(err)) console.error('fetchPosts:', err.message);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [center, radius, filters, bdFilter]);

  // ── BD filter handlers ──────────────────────────────────────────────────────
  const handleSelectDivision = useCallback((divisionId) => {
    const newFilter = { divisionId, districtId: '', upazilaId: '' };
    setBdFilter(newFilter);
    const target = getMapTarget(divisionId, '', '');
    if (target) setFlyTo(target);
  }, []);

  const handleSelectDistrict = useCallback((districtId) => {
    setBdFilter((f) => ({ ...f, districtId, upazilaId: '' }));
    const target = getMapTarget(bdFilter.divisionId, districtId, '');
    if (target) setFlyTo(target);
  }, [bdFilter.divisionId]);

  const handleSelectUpazila = useCallback((upazilaId) => {
    setBdFilter((f) => ({ ...f, upazilaId }));
    const target = getMapTarget(bdFilter.divisionId, bdFilter.districtId, upazilaId);
    if (target) setFlyTo(target);
  }, [bdFilter.divisionId, bdFilter.districtId]);

  const clearBdFilter = useCallback(() => {
    setBdFilter({ divisionId: '', districtId: '', upazilaId: '' });
  }, []);

  // ── Nominatim geocoding search ──────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchOpen(true);
    try {
      const { data } = await axios.get(
        'https://nominatim.openstreetmap.org/search',
        { params: { q, format: 'json', limit: 6 }, headers: { 'Accept-Language': 'en' } }
      );
      setSearchResults(data);
    } catch {
      // silent
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectResult = useCallback((result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setCenter({ lat, lng });
    setFlyTo({ lat, lng, zoom: 14 });
    setSearchQuery(result.display_name.split(',')[0]);
    setSearchResults([]);
    setSearchOpen(false);
  }, []);

  // ── Card click: fly map to post location ──────────────────────────────────
  const handleCardClick = useCallback((post) => {
    if (!post.location?.coordinates) return;
    const [lng, lat] = post.location.coordinates;
    setFlyTo({ lat, lng, zoom: 16 });
  }, []);

  const bdFilterActive = !!(bdFilter.divisionId || bdFilter.districtId || bdFilter.upazilaId);

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="map-feed-page">

      {/* ═══ LEFT SIDEBAR ═════════════════════════════════════════════════════ */}
      <aside className="mf-sidebar">

        {/* ── Division chips ────────────────────────────────────────────────── */}
        <div className="mf-division-chips">
          {ALL_DIVISIONS.map((div) => (
            <button
              key={div.id}
              className={`mf-division-chip${bdFilter.divisionId === div.id ? ' active' : ''}`}
              onClick={() =>
                bdFilter.divisionId === div.id ? clearBdFilter() : handleSelectDivision(div.id)
              }
            >
              {div.name}
            </button>
          ))}
        </div>

        {/* ── BD cascading dropdowns ──────────────────────────────────────────*/}
        {bdFilter.divisionId && (
          <div className="mf-bd-filter">
            <div className="mf-bd-filter-header">
              <span>Filter by Area</span>
              <button className="mf-bd-clear" onClick={clearBdFilter}>
                ✕ Clear
              </button>
            </div>

            <select
              value={bdFilter.districtId}
              onChange={(e) => handleSelectDistrict(e.target.value)}
            >
              <option value="">All Districts</option>
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {bdFilter.districtId && (
              <select
                value={bdFilter.upazilaId}
                onChange={(e) => handleSelectUpazila(e.target.value)}
              >
                <option value="">All Upazilas</option>
                {availableUpazilas.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Geo-filter controls (hide when BD filter active) ──────────────── */}
        {!bdFilterActive && (
          <div className="mf-radius-toggle">
            {RADIUS_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                className={`mf-radius-btn${radius === value ? ' active' : ''}`}
                onClick={() => setRadius(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Property filters ──────────────────────────────────────────────── */}
        <div className="mf-filters">
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filters.severityLevel}
            onChange={(e) => setFilters((f) => ({ ...f, severityLevel: e.target.value }))}
          >
            <option value="">All Severity</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="mf-resolved-toggle">
            <input
              type="checkbox"
              checked={filters.isResolved === 'true'}
              onChange={(e) =>
                setFilters((f) => ({ ...f, isResolved: e.target.checked ? 'true' : '' }))
              }
            />
            <span>Resolved only</span>
          </label>
        </div>

        {/* ── Post count ────────────────────────────────────────────────────── */}
        <p className="mf-count">
          {postsLoading
            ? 'Loading…'
            : `${posts.length} post${posts.length !== 1 ? 's' : ''} ${bdFilterActive ? 'in area' : 'nearby'}`}
        </p>

        {/* ── Post list ─────────────────────────────────────────────────────── */}
        <div className="mf-post-list">
          {!postsLoading && posts.length === 0 && (
            <p className="mf-empty">No posts found in this area.</p>
          )}

          {posts.map((post) => {
            const { divisionId, districtId, upazilaId } = getPostLocationIds(post);
            const crumb = getBreadcrumb(divisionId, districtId, upazilaId);
            return (
              <div
                key={post._id}
                className="mf-post-card"
                onClick={() => handleCardClick(post)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(post)}
              >
                <div className="mf-card-badges">
                  <CategoryBadge category={post.category} />
                  <SeverityBadge severity={post.severityLevel} />
                  {post.isResolved && <span className="badge badge-resolved">✓ Resolved</span>}
                </div>

                <h4 className="mf-card-title">{post.title}</h4>

                {crumb.label && (
                  <p className="mf-breadcrumb">
                    {crumb.divisionName && (
                      <button
                        className="mf-breadcrumb-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                            handleSelectDivision(divisionId);
                        }}
                      >
                        {crumb.divisionName}
                      </button>
                    )}
                    {crumb.districtName && (
                      <>
                        <span className="mf-bc-sep"> › </span>
                        <button
                          className="mf-breadcrumb-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!bdFilter.divisionId) handleSelectDivision(divisionId);
                            handleSelectDistrict(districtId);
                          }}
                        >
                          {crumb.districtName}
                        </button>
                      </>
                    )}
                    {crumb.upazilaName && (
                      <>
                        <span className="mf-bc-sep"> › </span>
                        <span className="mf-bc-upazila">{crumb.upazilaName}</span>
                      </>
                    )}
                  </p>
                )}

                <p className="mf-card-meta">
                  {post.areaName && <>{post.areaName} · </>}
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </p>

                <div className="mf-card-footer">
                  <span className="mf-upvotes">▲ {post.upvotes?.length ?? 0}</span>
                  <Link
                    to={`/post/${post._id}`}
                    className="mf-view-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAB */}
        <Link to="/create" className="mf-fab">
          + Create Post
        </Link>
      </aside>

      {/* ═══ RIGHT MAP PANEL ══════════════════════════════════════════════════ */}
      <div className="mf-map-panel">

        {/* Search bar overlay */}
        <div className="mf-search-wrap">
          <form className="mf-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              className="mf-search-input"
              placeholder="Search area or address…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSearchOpen(false);
              }}
            />
            <button type="submit" className="mf-search-btn" disabled={searchLoading}>
              {searchLoading ? '…' : '🔍'}
            </button>
          </form>

          {searchOpen && searchResults.length > 0 && (
            <ul className="mf-search-results">
              {searchResults.map((r) => (
                <li key={r.place_id} onClick={() => handleSelectResult(r)}>
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Radius selector overlay — only when no BD filter */}
        {!bdFilterActive && (
          <div className="mf-radius-bar">
            {RADIUS_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                className={`mf-radius-btn${radius === value ? ' active' : ''}`}
                onClick={() => setRadius(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          className="mf-leaflet"
          zoomControl={true}
        >
          <MapController flyTo={flyTo} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Radius indicator circle — only when no BD filter */}
          {!bdFilterActive && (
            <Circle
              center={[center.lat, center.lng]}
              radius={radius}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '6 4',
              }}
            />
          )}

          {/* Clustered post markers */}
          <MarkerClusterGroup chunkedLoading>
            {posts.map((post) => {
              if (!post.location?.coordinates) return null;
              const [pLng, pLat] = post.location.coordinates;
              const color = SEVERITY_COLORS[post.severityLevel] ?? '#6b7280';
              const icon = CATEGORY_ICONS[post.category] || '📌';
              const { divisionId, districtId, upazilaId } = getPostLocationIds(post);
              const crumb = getBreadcrumb(divisionId, districtId, upazilaId);
              return (
                <CircleMarker
                  key={post._id}
                  center={[pLat, pLng]}
                  radius={10}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.92}>
                    <span>
                      {icon} {post.category}
                      {(post.areaName || crumb.districtName) && (
                        <> — {post.areaName || crumb.districtName}</>
                      )}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="mf-popup">
                      <strong>{post.title}</strong>
                      <div className="mf-popup-badges">
                        <span className="badge badge-category">{icon} {post.category}</span>
                        <span className="badge badge-severity" style={{ background: color }}>
                          {post.severityLevel}
                        </span>
                      </div>
                      {crumb.label && (
                        <p className="mf-popup-area" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          📍 {crumb.label}
                        </p>
                      )}
                      {post.areaName && !crumb.label && (
                        <p className="mf-popup-area">{post.areaName}</p>
                      )}
                      <Link to={`/post/${post._id}`} className="mf-popup-link">
                        View Post →
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
}
