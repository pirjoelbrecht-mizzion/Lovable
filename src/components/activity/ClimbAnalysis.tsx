import { useState, useEffect } from 'react';
import { Mountain, TrendingUp, Clock, MapPin, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ClimbSegment } from '@/engine/trailAnalysis';

interface ClimbAnalysisProps {
  logEntryId: string;
  userId: string;
}

interface ClimbData {
  id: string;
  climb_number: number;
  start_distance_m: number;
  end_distance_m: number;
  elevation_gain_m: number;
  duration_min: number | null;
  vam: number | null;
  average_grade_pct: number;
  distance_km: number;
  category: string;
}

interface TerrainAnalysisData {
  peak_vam: number | null;
  average_climb_vam: number | null;
  total_climbing_time_min: number | null;
  total_climbing_distance_km: number | null;
  significant_climbs_count: number;
  vam_first_to_last_dropoff_pct: number | null;
  total_climb_elevation_m: number | null;
}

export function ClimbAnalysis({ logEntryId, userId }: ClimbAnalysisProps) {
  const [climbs, setClimbs] = useState<ClimbData[]>([]);
  const [terrainStats, setTerrainStats] = useState<TerrainAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClimbData();
  }, [logEntryId]);

  async function loadClimbData() {
    try {
      const [climbsResult, terrainResult] = await Promise.all([
        supabase
          .from('activity_climb_segments')
          .select('*')
          .eq('log_entry_id', logEntryId)
          .eq('user_id', userId)
          .order('climb_number', { ascending: true }),
        supabase
          .from('activity_terrain_analysis')
          .select('peak_vam, average_climb_vam, total_climbing_time_min, total_climbing_distance_km, significant_climbs_count, vam_first_to_last_dropoff_pct, total_climb_elevation_m')
          .eq('log_entry_id', logEntryId)
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (climbsResult.data) {
        setClimbs(climbsResult.data);
      }

      if (terrainResult.data) {
        setTerrainStats(terrainResult.data);
      }
    } catch (error) {
      console.error('Error loading climb data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>
        Loading climb analysis...
      </div>
    );
  }

  if (climbs.length === 0 || !terrainStats) {
    return null;
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getFatigueRating = (dropoff: number | null) => {
    if (!dropoff) return { label: 'N/A', color: '#8b949e' };
    const absDropoff = Math.abs(dropoff);
    if (absDropoff < 5) return { label: 'Excellent', color: '#3fb950' };
    if (absDropoff < 10) return { label: 'Good', color: '#58a6ff' };
    if (absDropoff < 15) return { label: 'Fair', color: '#d29922' };
    return { label: 'Fatigued', color: '#f85149' };
  };

  const getEfficiencyScore = () => {
    if (!terrainStats.average_climb_vam || !terrainStats.peak_vam) return 0;
    return Math.round((terrainStats.average_climb_vam / terrainStats.peak_vam) * 100);
  };

  const getStrainIndex = () => {
    if (!terrainStats.average_climb_vam) return 0;
    if (terrainStats.average_climb_vam < 400) return Math.round(terrainStats.average_climb_vam / 20);
    if (terrainStats.average_climb_vam < 600) return Math.round(20 + (terrainStats.average_climb_vam - 400) / 10);
    return Math.min(50, Math.round(40 + (terrainStats.average_climb_vam - 600) / 20));
  };

  const getRecommendations = () => {
    const recs: string[] = [];
    const efficiencyScore = getEfficiencyScore();
    const dropoff = terrainStats.vam_first_to_last_dropoff_pct || 0;

    if (efficiencyScore < 70) {
      recs.push("You're holding steady on downhills. Practice downhill running technique to improve speed and reduce impact.");
    }

    if (Math.abs(dropoff) > 10) {
      recs.push("Highly technical terrain. Great job navigating challenging conditions!");
    } else {
      recs.push("Good climbing performance with only " + Math.abs(dropoff).toFixed(0) + "% VAM decline. Strong endurance on sustained climbs.");
    }

    return recs;
  };

  const fatigueRating = getFatigueRating(terrainStats.vam_first_to_last_dropoff_pct);
  const efficiencyScore = getEfficiencyScore();
  const strainIndex = getStrainIndex();

  return (
    <div style={{
      background: 'rgba(22, 27, 34, 0.8)',
      border: '1px solid rgba(240, 246, 252, 0.1)',
      borderRadius: '12px',
      padding: '24px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <Mountain size={20} style={{ color: '#58a6ff' }} />
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#c9d1d9' }}>
          Climb Analysis
        </h3>
        <span style={{
          marginLeft: 'auto',
          fontSize: '12px',
          color: '#8b949e',
          background: 'rgba(56, 139, 253, 0.1)',
          padding: '4px 8px',
          borderRadius: '6px'
        }}>
          {climbs.length} significant climb{climbs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Peak VAM</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#58a6ff' }}>
            {terrainStats.peak_vam ? Math.round(terrainStats.peak_vam) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>m/hr</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Average VAM</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3fb950' }}>
            {terrainStats.average_climb_vam ? Math.round(terrainStats.average_climb_vam) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>m/hr</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Fatigue Resistance</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: fatigueRating.color }}>
            {terrainStats.vam_first_to_last_dropoff_pct !== null
              ? `${Math.abs(terrainStats.vam_first_to_last_dropoff_pct).toFixed(0)}%`
              : '—'
            }
          </div>
          <div style={{ fontSize: '11px', color: fatigueRating.color }}>{fatigueRating.label}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Climbing Flow</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#c9d1d9' }}>
            {terrainStats.total_climbing_time_min ? formatDuration(terrainStats.total_climbing_time_min) : '—'}
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>
            {terrainStats.total_climbing_distance_km ? `${terrainStats.total_climbing_distance_km.toFixed(1)} km` : '—'}
          </div>
        </div>
      </div>

      {climbs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#8b949e',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(240, 246, 252, 0.1)'
          }}>
            Individual Climbs
          </div>

          {climbs.map((climb) => (
            <div
              key={climb.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '12px',
                background: 'rgba(13, 17, 23, 0.5)',
                borderRadius: '8px',
                marginBottom: '8px',
                border: '1px solid rgba(240, 246, 252, 0.05)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #58a6ff, #3fb950)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '700',
                color: '#fff',
                flexShrink: 0
              }}>
                #{climb.climb_number}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#c9d1d9', marginBottom: '2px' }}>
                  <strong>{Math.round(climb.elevation_gain_m)}m</strong> gain
                  {' · '}
                  <span style={{ color: '#8b949e' }}>{climb.distance_km.toFixed(1)}km</span>
                  {' @ '}
                  <span style={{ color: climb.average_grade_pct > 10 ? '#f85149' : '#58a6ff' }}>
                    {climb.average_grade_pct.toFixed(1)}%
                  </span>
                </div>
                {climb.duration_min && (
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>
                    {formatDuration(climb.duration_min)} climbing time
                  </div>
                )}
              </div>

              {climb.vam && (
                <div style={{
                  textAlign: 'right',
                  paddingLeft: '16px',
                  borderLeft: '1px solid rgba(240, 246, 252, 0.1)',
                  flexShrink: 0
                }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#58a6ff' }}>
                    {Math.round(climb.vam)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase' }}>
                    VAM
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        padding: '16px',
        background: 'rgba(56, 139, 253, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(56, 139, 253, 0.2)',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#58a6ff', marginBottom: '8px' }}>
          💡 Insight
        </div>
        <div style={{ fontSize: '13px', color: '#c9d1d9', lineHeight: '1.5' }}>
          {terrainStats.average_climb_vam && terrainStats.peak_vam && terrainStats.average_climb_vam > 500
            ? `Strong climbing performance with ${Math.round(terrainStats.peak_vam)} m/hr peak VAM. ${Math.abs(terrainStats.vam_first_to_last_dropoff_pct || 0) < 10 ? 'Excellent endurance on sustained climbs.' : 'Some endurance on acquiesced climbs.'}`
            : 'Good climbing performance with only ' + Math.abs(terrainStats.vam_first_to_last_dropoff_pct || 0).toFixed(1) + '% VAM decline. Strong endurance on sustained climbs.'
          }
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#c9d1d9',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Activity size={16} style={{ color: '#3fb950' }} />
          Performance Insights
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '12px',
            background: 'rgba(13, 17, 23, 0.5)',
            borderRadius: '8px',
            border: '1px solid rgba(240, 246, 252, 0.05)'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Efficiency Score</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3fb950' }}>
              {efficiencyScore}/100
            </div>
            <div style={{ fontSize: '10px', color: '#8b949e' }}>
              {efficiencyScore > 80 ? 'Excellent' : efficiencyScore > 65 ? 'Good' : 'Fair'}
            </div>
          </div>

          <div style={{
            padding: '12px',
            background: 'rgba(13, 17, 23, 0.5)',
            borderRadius: '8px',
            border: '1px solid rgba(240, 246, 252, 0.05)'
          }}>
            <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: '4px' }}>Peak Strain Index</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: strainIndex > 35 ? '#f85149' : '#58a6ff' }}>
              {strainIndex}
            </div>
            <div style={{ fontSize: '10px', color: '#8b949e' }}>
              {strainIndex > 35 ? 'High' : strainIndex > 25 ? 'Moderate' : 'Comfortable'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: '#8b949e', marginTop: '12px' }}>
          <div style={{ fontWeight: '600', color: '#c9d1d9', marginBottom: '8px' }}>
            RECOMMENDATIONS
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {getRecommendations().map((rec, idx) => (
              <li key={idx} style={{ marginBottom: '4px', color: '#8b949e' }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
