import { useState, useEffect } from 'react';
import {
  getDivisions,
  getDistrictsByDivision,
  getUpazilasByDistrict,
  getUnionsByUpazila,
  buildDisplayLabel,
} from '../utils/bdLocation';
import toast from 'react-hot-toast';

export default function BDLocationSelector({ value, onChange, error }) {
  // Selected entities (full objects)
  const [selectedDivision, setSelectedDivision] = useState(value?.division || null);
  const [selectedDistrict, setSelectedDistrict] = useState(value?.district || null);
  const [selectedUpazila, setSelectedUpazila] = useState(value?.upazila || null);
  const [selectedUnion, setSelectedUnion] = useState(value?.union || null);
  const [landmark, setLandmark] = useState(value?.landmark || '');

  // GPS detection state
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Filtered lists
  const [districts, setDistricts] = useState([]);
  const [upazilas, setUpazilas] = useState([]);
  const [unions, setUnions] = useState([]);

  // Initialize from value prop
  useEffect(() => {
    if (value?.division) {
      setSelectedDivision(value.division);
      setDistricts(getDistrictsByDivision(value.division.id));
    }
    if (value?.district) {
      setSelectedDistrict(value.district);
      setUpazilas(getUpazilasByDistrict(value.district.id));
    }
    if (value?.upazila) {
      setSelectedUpazila(value.upazila);
      setUnions(getUnionsByUpazila(value.upazila.id));
    }
    if (value?.union) setSelectedUnion(value.union);
    if (value?.landmark) setLandmark(value.landmark);
  }, []);

  // Trigger onChange whenever location data changes
  useEffect(() => {
    const locationData = {
      division: selectedDivision,
      district: selectedDistrict,
      upazila: selectedUpazila,
      union: selectedUnion,
      landmark,
      lat: detectedLocation?.lat || (selectedDistrict ? parseFloat(selectedDistrict.lat) : null),
      lng: detectedLocation?.lng || (selectedDistrict ? parseFloat(selectedDistrict.lng) : null),
      displayLabel: buildDisplayLabel({
        union: selectedUnion,
        upazila: selectedUpazila,
        district: selectedDistrict,
        division: selectedDivision,
        landmark,
      }),
    };
    onChange(locationData);
  }, [selectedDivision, selectedDistrict, selectedUpazila, selectedUnion, landmark, detectedLocation]);

  const handleDivisionChange = (e) => {
    const divId = e.target.value;
    if (!divId) {
      setSelectedDivision(null);
      setDistricts([]);
      setSelectedDistrict(null);
      setUpazilas([]);
      setSelectedUpazila(null);
      setUnions([]);
      setSelectedUnion(null);
      return;
    }

    const div = getDivisions().find((d) => d.id === divId);
    setSelectedDivision(div);
    setDistricts(getDistrictsByDivision(divId));

    // Reset children
    setSelectedDistrict(null);
    setUpazilas([]);
    setSelectedUpazila(null);
    setUnions([]);
    setSelectedUnion(null);
  };

  const handleDistrictChange = (e) => {
    const distId = e.target.value;
    if (!distId) {
      setSelectedDistrict(null);
      setUpazilas([]);
      setSelectedUpazila(null);
      setUnions([]);
      setSelectedUnion(null);
      return;
    }

    const dist = districts.find((d) => d.id === distId);
    setSelectedDistrict(dist);
    setUpazilas(getUpazilasByDistrict(distId));

    // Reset children
    setSelectedUpazila(null);
    setUnions([]);
    setSelectedUnion(null);
  };

  const handleUpazilaChange = (e) => {
    const upazId = e.target.value;
    if (!upazId) {
      setSelectedUpazila(null);
      setUnions([]);
      setSelectedUnion(null);
      return;
    }

    const upaz = upazilas.find((u) => u.id === upazId);
    setSelectedUpazila(upaz);
    setUnions(getUnionsByUpazila(upazId));

    // Reset children
    setSelectedUnion(null);
  };

  const handleUnionChange = (e) => {
    const unionId = e.target.value;
    if (!unionId) {
      setSelectedUnion(null);
      return;
    }

    const union = unions.find((u) => u.id === unionId);
    setSelectedUnion(union);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setDetectedLocation({ lat: latitude, lng: longitude });

        try {
          // Reverse geocode using Nominatim
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          // Try to match district from response
          let matched = false;
          if (data.address) {
            const { state_district, state } = data.address;

            // Try to match district by name
            const allDistricts = getDivisions()
              .flatMap((div) => getDistrictsByDivision(div.id))
              .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);

            const matchedDistrict = allDistricts.find(
              (d) => state_district && d.name.toLowerCase().includes(state_district.toLowerCase().replace(' district', ''))
            );

            if (matchedDistrict) {
              // Find parent division
              const parentDivision = getDivisions().find((div) => div.id === matchedDistrict.division_id);

              if (parentDivision) {
                setSelectedDivision(parentDivision);
                setDistricts(getDistrictsByDivision(parentDivision.id));
                setSelectedDistrict(matchedDistrict);
                setUpazilas(getUpazilasByDistrict(matchedDistrict.id));

                toast.success(
                  `📍 Location detected: ${matchedDistrict.name} District. Please complete Upazila and Union below.`,
                  { duration: 5000 }
                );
                matched = true;
              }
            }
          }

          if (!matched) {
            toast.success(
              '📍 GPS coordinates saved but could not auto-match district. Please select your area manually below.',
              { duration: 5000 }
            );
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
          toast.success('📍 GPS coordinates saved. Please select your area manually below.');
        }

        setIsDetecting(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get location. Please select manually.');
        setIsDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-selector-container">
      <label className="location-main-label">
        📍 Incident Location <span className="required">*</span>
      </label>

      {/* Use Current Location Button */}
      <button
        type="button"
        className={`btn-use-location ${detectedLocation ? 'detected' : ''}`}
        onClick={handleUseCurrentLocation}
        disabled={isDetecting}
      >
        {isDetecting ? (
          <>
            <span className="spinner-small"></span> Detecting...
          </>
        ) : (
          <>📍 Use My Current Location</>
        )}
      </button>

      {detectedLocation && (
        <div className="location-detected-box">
          ✅ GPS location detected: {detectedLocation.lat.toFixed(4)}, {detectedLocation.lng.toFixed(4)}
        </div>
      )}

      <div className="location-divider">— or select manually —</div>

      {/* Step 1: Division */}
      <div className="location-step">
        <div className="step-header">
          <span className={`step-badge ${selectedDivision ? 'completed' : ''}`}>1</span>
          <label>Division</label>
        </div>
        <select value={selectedDivision?.id || ''} onChange={handleDivisionChange}>
          <option value="">Select Division</option>
          {getDivisions().map((div) => (
            <option key={div.id} value={div.id}>
              {div.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: District */}
      <div className="location-step">
        <div className="step-header">
          <span className={`step-badge ${selectedDistrict ? 'completed' : ''}`}>2</span>
          <label>
            {!selectedDivision && <span className="lock-icon">🔒 </span>}
            District
          </label>
        </div>
        <select
          value={selectedDistrict?.id || ''}
          onChange={handleDistrictChange}
          disabled={!selectedDivision}
        >
          <option value="">Select District</option>
          {districts.map((dist) => (
            <option key={dist.id} value={dist.id}>
              {dist.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 3: Upazila */}
      <div className="location-step">
        <div className="step-header">
          <span className={`step-badge ${selectedUpazila ? 'completed' : ''}`}>3</span>
          <label>
            {!selectedDistrict && <span className="lock-icon">🔒 </span>}
            Upazila / Thana
          </label>
        </div>
        <select
          value={selectedUpazila?.id || ''}
          onChange={handleUpazilaChange}
          disabled={!selectedDistrict}
        >
          <option value="">Select Upazila / Thana</option>
          {upazilas.map((upaz) => (
            <option key={upaz.id} value={upaz.id}>
              {upaz.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 4: Union */}
      <div className="location-step">
        <div className="step-header">
          <span className={`step-badge ${selectedUnion ? 'completed' : ''}`}>4</span>
          <label>
            {!selectedUpazila && <span className="lock-icon">🔒 </span>}
            Union / Ward / Area <span className="optional">(Optional)</span>
          </label>
        </div>
        <select value={selectedUnion?.id || ''} onChange={handleUnionChange} disabled={!selectedUpazila}>
          <option value="">Select Union / Ward / Area</option>
          {unions.map((union) => (
            <option key={union.id} value={union.id}>
              {union.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 5: Landmark */}
      <div className="location-step">
        <div className="step-header">
          <span className="step-badge">5</span>
          <label>
            Specific Landmark <span className="optional">(Optional)</span>
          </label>
        </div>
        <input
          type="text"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          placeholder="e.g. Sector 7, Road 15, Near XYZ School"
          maxLength={100}
        />
      </div>

      {/* Location Summary */}
      {selectedDistrict && (
        <div className="location-summary">
          <div className="breadcrumb">
            {selectedDivision?.name} › {selectedDistrict?.name}
            {selectedUpazila && ` › ${selectedUpazila.name}`}
            {selectedUnion && ` › ${selectedUnion.name}`}
          </div>
          {landmark && <div className="landmark-label">📌 {landmark}</div>}
          <div className="coordinates">
            🌐{' '}
            {(detectedLocation?.lat || parseFloat(selectedDistrict.lat)).toFixed(4)},{' '}
            {(detectedLocation?.lng || parseFloat(selectedDistrict.lng)).toFixed(4)}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <div className="location-error">{error}</div>}
    </div>
  );
}
