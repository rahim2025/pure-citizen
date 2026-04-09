import { useState, useEffect } from 'react';
import {
  getDivisions,
  getDistrictsByDivision,
  getUpazilasByDistrict,
  getUnionsByUpazila,
} from '../utils/bdLocation';
import './AreaSelector.css';

export default function AreaSelector({ value = {}, onChange, isMobile = false }) {
  const [division, setDivision] = useState(value.division || null);
  const [district, setDistrict] = useState(value.district || null);
  const [upazila, setUpazila] = useState(value.upazila || null);
  const [union, setUnion] = useState(value.union || null);

  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [unions, setUnions] = useState([]);

  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  const divisions = getDivisions();

  // Load child options when parent changes
  useEffect(() => {
    if (division) {
      setDistricts(getDistrictsByDivision(division.id));
    } else {
      setDistricts([]);
      setDistrict(null);
    }
  }, [division]);

  useEffect(() => {
    if (district) {
      setUpazilas(getUpazilasByDistrict(district.id));
    } else {
      setUpazilas([]);
      setUpazila(null);
    }
  }, [district]);

  useEffect(() => {
    if (upazila) {
      setUnions(getUnionsByUpazila(upazila.id));
    } else {
      setUnions([]);
      setUnion(null);
    }
  }, [upazila]);

  // Trigger onChange when any selection changes
  useEffect(() => {
    const queryParams = {};
    if (union) queryParams.union_id = union.id;
    else if (upazila) queryParams.upazila_id = upazila.id;
    else if (district) queryParams.district_id = district.id;
    else if (division) queryParams.division_id = division.id;

    onChange?.({
      division,
      district,
      upazila,
      union,
      queryParams,
    });
  }, [division, district, upazila, union, onChange]);

  const handleDivisionChange = (e) => {
    const selected = divisions.find((d) => d.id === e.target.value);
    setDivision(selected || null);
    setDistrict(null);
    setUpazila(null);
    setUnion(null);
  };

  const handleDistrictChange = (e) => {
    const selected = districts.find((d) => d.id === e.target.value);
    setDistrict(selected || null);
    setUpazila(null);
    setUnion(null);
  };

  const handleUpazilaChange = (e) => {
    const selected = upazilas.find((u) => u.id === e.target.value);
    setUpazila(selected || null);
    setUnion(null);
  };

  const handleUnionChange = (e) => {
    const selected = unions.find((u) => u.id === e.target.value);
    setUnion(selected || null);
  };

  const handleClearAll = () => {
    setDivision(null);
    setDistrict(null);
    setUpazila(null);
    setUnion(null);
  };

  const handleBreadcrumbClick = (level) => {
    if (level === 'division') {
      setDistrict(null);
      setUpazila(null);
      setUnion(null);
    } else if (level === 'district') {
      setUpazila(null);
      setUnion(null);
    } else if (level === 'upazila') {
      setUnion(null);
    }
  };

  const buildBreadcrumb = () => {
    const parts = [];
    if (!division && !district && !upazila && !union) {
      return 'Bangladesh';
    }
    
    if (division) {
      parts.push({ label: division.name, level: 'division' });
    }
    if (district) {
      parts.push({ label: district.name, level: 'district' });
    }
    if (upazila) {
      parts.push({ label: upazila.name, level: 'upazila' });
    }
    if (union) {
      parts.push({ label: union.name, level: 'union' });
    }
    
    return parts;
  };

  const breadcrumb = buildBreadcrumb();

  const renderDropdowns = () => (
    <div className="area-selector-dropdowns">
      <select value={division?.id || ''} onChange={handleDivisionChange} className="area-select">
        <option value="">Select Division</option>
        {divisions.map((div) => (
          <option key={div.id} value={div.id}>
            {div.name}
          </option>
        ))}
      </select>

      <select
        value={district?.id || ''}
        onChange={handleDistrictChange}
        disabled={!division}
        className="area-select"
      >
        <option value="">Select District</option>
        {districts.map((dis) => (
          <option key={dis.id} value={dis.id}>
            {dis.name}
          </option>
        ))}
      </select>

      <select
        value={upazila?.id || ''}
        onChange={handleUpazilaChange}
        disabled={!district}
        className="area-select"
      >
        <option value="">Select Upazila</option>
        {upazilas.map((upa) => (
          <option key={upa.id} value={upa.id}>
            {upa.name}
          </option>
        ))}
      </select>

      <select
        value={union?.id || ''}
        onChange={handleUnionChange}
        disabled={!upazila}
        className="area-select"
      >
        <option value="">Select Union</option>
        {unions.map((uni) => (
          <option key={uni.id} value={uni.id}>
            {uni.name}
          </option>
        ))}
      </select>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button className="mobile-area-btn" onClick={() => setShowMobileDrawer(true)}>
          <span className="location-icon">📍</span>
          {typeof breadcrumb === 'string' ? breadcrumb : breadcrumb.map(b => b.label).join(' › ')}
        </button>

        {showMobileDrawer && (
          <div className="mobile-drawer-overlay" onClick={() => setShowMobileDrawer(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h3>Select Location</h3>
                <button onClick={() => setShowMobileDrawer(false)} className="drawer-close">
                  ✕
                </button>
              </div>
              <div className="drawer-content">
                {renderDropdowns()}
                <div className="drawer-actions">
                  <button onClick={handleClearAll} className="btn-secondary">
                    Clear All
                  </button>
                  <button onClick={() => setShowMobileDrawer(false)} className="btn-primary">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="area-selector">
      <div className="area-selector-header">
        <div className="breadcrumb">
          {typeof breadcrumb === 'string' ? (
            <span className="breadcrumb-item">{breadcrumb}</span>
          ) : (
            breadcrumb.map((item, idx) => (
              <span key={idx}>
                <button
                  className="breadcrumb-item clickable"
                  onClick={() => handleBreadcrumbClick(item.level)}
                >
                  {item.label}
                </button>
                {idx < breadcrumb.length - 1 && <span className="breadcrumb-sep">›</span>}
              </span>
            ))
          )}
        </div>
        {(division || district || upazila || union) && (
          <button onClick={handleClearAll} className="clear-btn">
            Clear All
          </button>
        )}
      </div>
      {renderDropdowns()}
    </div>
  );
}
