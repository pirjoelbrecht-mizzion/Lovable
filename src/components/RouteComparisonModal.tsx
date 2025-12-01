import { useState, useEffect } from 'react';
import Modal from './Modal';
import type { GPXSegmentAnalysis } from '@/utils/gpxParser';
import type { RouteMatch } from '@/utils/routeMatcher';
import { getRouteComparisons } from '@/utils/routeMatcher';
import { formatTime } from '@/utils/gpxParser';

interface RouteComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  segments: GPXSegmentAnalysis[];
}

export default function RouteComparisonModal({
  isOpen,
  onClose,
  eventId,
  segments,
}: RouteComparisonModalProps) {
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0);
  const [matches, setMatches] = useState<RouteMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      loadMatches();
    }
  }, [isOpen, eventId, selectedSegmentIndex]);

  async function loadMatches() {
    setLoading(true);
    try {
      const data = await getRouteComparisons(eventId, selectedSegmentIndex);
      setMatches(data);
    } catch (err) {
      console.error('Error loading route comparisons:', err);
    } finally {
      setLoading(false);
    }
  }

  const selectedSegment = segments[selectedSegmentIndex];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Route Comparison: Historical Matches">
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
            Select Segment:
          </label>
          <select
            value={selectedSegmentIndex}
            onChange={(e) => setSelectedSegmentIndex(parseInt(e.target.value))}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '0.95rem',
            }}
          >
            {segments.map((seg, idx) => (
              <option key={idx} value={idx}>
                Segment {idx + 1}: {seg.type.toUpperCase()} - {seg.distanceKm.toFixed(2)}km,
                {seg.type === 'uphill' && ` +${seg.elevationGainM}m`}
                {seg.type === 'downhill' && ` -${seg.elevationLossM}m`}
                {seg.type === 'flat' && ` ${seg.gradeAvgPct.toFixed(1)}%`}
              </option>
            ))}
          </select>
        </div>

        {selectedSegment && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem' }}>
              Segment Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Type</div>
                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{selectedSegment.type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Distance</div>
                <div style={{ fontWeight: 600 }}>{selectedSegment.distanceKm.toFixed(2)} km</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Elevation Gain</div>
                <div style={{ fontWeight: 600 }}>+{selectedSegment.elevationGainM}m</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Elevation Loss</div>
                <div style={{ fontWeight: 600 }}>-{selectedSegment.elevationLossM}m</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Avg Grade</div>
                <div style={{ fontWeight: 600 }}>{selectedSegment.gradeAvgPct.toFixed(1)}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Grade</div>
                <div style={{ fontWeight: 600 }}>{selectedSegment.gradeMaxPct.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        )}

        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
          Historical Matches ({matches.length})
        </h3>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            Loading matches...
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            No similar segments found in your training history.
            <br />
            <span style={{ fontSize: '0.9rem' }}>
              Run more activities with elevation data to build comparisons.
            </span>
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {matches.map((match, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: '8px',
                  border: `2px solid ${
                    match.similarityScore >= 85
                      ? 'var(--success-color)'
                      : match.similarityScore >= 70
                      ? 'var(--warning-color)'
                      : 'var(--border-color)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                      {match.logEntryTitle}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {new Date(match.logEntryDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor:
                        match.similarityScore >= 85
                          ? 'var(--success-bg)'
                          : match.similarityScore >= 70
                          ? 'var(--warning-bg)'
                          : 'var(--secondary-bg)',
                      color:
                        match.similarityScore >= 85
                          ? 'var(--success-color)'
                          : match.similarityScore >= 70
                          ? 'var(--warning-color)'
                          : 'var(--text-secondary)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    {match.similarityScore}% match
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time</div>
                    <div style={{ fontWeight: 600 }}>{formatTime(match.actualTime)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pace</div>
                    <div style={{ fontWeight: 600 }}>{match.actualPace.toFixed(2)} min/km</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Elevation Match</div>
                    <div style={{ fontWeight: 600 }}>{match.elevationCorrelation.toFixed(0)}%</div>
                  </div>
                </div>

                {match.conditions && (
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {match.conditions.temperature && (
                      <span>{match.conditions.temperature.toFixed(0)}°C</span>
                    )}
                    {match.conditions.weather && <span>{match.conditions.weather}</span>}
                    {match.conditions.humidity && <span>{match.conditions.humidity.toFixed(0)}% humidity</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
