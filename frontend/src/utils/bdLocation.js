import DIVISIONS from './bd/divisions.json';
import DISTRICTS from './bd/districts.json';
import UPAZILAS from './bd/upazilas.json';
import UNIONS from './bd/unions.json';

export { DIVISIONS, DISTRICTS, UPAZILAS, UNIONS };

export const getDivisions = () => DIVISIONS;

export const getDivisionById = (id) =>
  DIVISIONS.find((d) => d.id === String(id)) || null;

export const getDistrictsByDivision = (divisionId) =>
  DISTRICTS.filter((d) => d.division_id === String(divisionId));

export const getDistrictById = (id) =>
  DISTRICTS.find((d) => d.id === String(id)) || null;

export const getUpazilasByDistrict = (districtId) =>
  UPAZILAS.filter((u) => u.district_id === String(districtId));

export const getUpazilaById = (id) =>
  UPAZILAS.find((u) => u.id === String(id)) || null;

export const getUnionsByUpazila = (upazilaId) =>
  UNIONS.filter((u) => u.upazila_id === String(upazilaId));

export const getUnionById = (id) =>
  UNIONS.find((u) => u.id === String(id)) || null;

/**
 * Builds a display label from location components
 * @param {Object} params - Location components
 * @returns {String} - Formatted location label
 */
export const buildDisplayLabel = ({ union, upazila, district, division, landmark }) => {
  const parts = [];
  if (landmark) parts.push(landmark);
  if (union?.name) parts.push(union.name);
  if (upazila?.name) parts.push(upazila.name);
  if (district?.name) parts.push(district.name);
  if (division?.name) parts.push(division.name);
  return parts.join(', ');
};

/**
 * Returns { divisionName, districtName, upazilaName, unionName, label }
 * label = "Division › District › Upazila › Union" (only defined segments joined)
 */
export const getBreadcrumb = (divisionId, districtId, upazilaId, unionId) => {
  const division = divisionId ? getDivisionById(divisionId) : null;
  const district = districtId ? getDistrictById(districtId) : null;
  const upazila = upazilaId ? getUpazilaById(upazilaId) : null;
  const union = unionId ? getUnionById(unionId) : null;

  const parts = [division?.name, district?.name, upazila?.name, union?.name].filter(Boolean);

  return {
    divisionName: division?.name || '',
    districtName: district?.name || '',
    upazilaName: upazila?.name || '',
    unionName: union?.name || '',
    label: parts.join(' › '),
  };
};

/**
 * Returns { lat, lng, zoom } to fly the map to the selected filter.
 * Priority: upazila (use parent district coords, zoom 12)
 *           district (lat/lng from districts.json, zoom 10)
 *           division (lat/lng from divisions.json, zoom 8)
 */
export const getMapTarget = (divisionId, districtId, upazilaId) => {
  if (upazilaId) {
    const upazila = getUpazilaById(upazilaId);
    if (upazila) {
      const district = getDistrictById(upazila.district_id);
      if (district) return { lat: parseFloat(district.lat), lng: parseFloat(district.lng), zoom: 12 };
    }
  }
  if (districtId) {
    const district = getDistrictById(districtId);
    if (district) return { lat: parseFloat(district.lat), lng: parseFloat(district.lng), zoom: 10 };
  }
  if (divisionId) {
    const division = getDivisionById(divisionId);
    if (division) return { lat: division.lat, lng: division.lng, zoom: 8 };
  }
  return null;
};
