/**
 * Activity Detail Page - Compact Neon HUD Design
 * Bento-style grid layout with dark navy background and cyan/orange accents
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LogEntry, ActivityPhoto, ActivitySegment, ActivityBestEffort, AthleteGear } from '@/types';
import { ActivityPhotoGallery } from '@/components/activity/ActivityPhotoGallery';
import { ActivitySegments } from '@/components/activity/ActivitySegments';
import { ActivityBestEfforts } from '@/components/activity/ActivityBestEfforts';
import { ActivityGear } from '@/components/activity/ActivityGear';
import { ActivityTerrainBreakdown } from '@/components/activity/ActivityTerrainBreakdown';
import { ActivityPerformanceInsights } from '@/components/activity/ActivityPerformanceInsights';
import { WeatherImpactCard } from '@/components/activity/WeatherImpactCard';
import RouteMap from '@/components/RouteMap';
import { stravaRichDataService } from '@/services/stravaRichDataService';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { analyzeTerrainFromStreams, analyzePerformance } from '@/engine/trailAnalysis';
import { ArrowLeft } from 'lucide-react';

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<LogEntry | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [segments, setSegments] = useState<ActivitySegment[]>([]);
  const [bestEfforts, setBestEfforts] = useState<ActivityBestEffort[]>([]);
  const [gear, setGear] = useState<AthleteGear | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadActivityData();
  }, [id]);

  async function loadActivityData() {
    if (!id) return;

    try {
      setLoading(true);

      const currentUserId = await getCurrentUserId();
      setUserId(currentUserId);

      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching activity:', error);
        navigate('/log');
        return;
      }

      const logEntry: LogEntry = {
        id: data.id,
        title: data.title,
        dateISO: data.date,
        km: data.km,
        durationMin: data.duration_min,
        hrAvg: data.hr_avg,
        source: data.source,
        externalId: data.external_id,
        mapPolyline: data.map_polyline,
        mapSummaryPolyline: data.map_summary_polyline,
        elevationGain: data.elevation_gain,
        elevationLoss: data.elevation_loss,
        elevationLow: data.elevation_low,
        elevationStream: data.elevation_stream,
        distanceStream: data.distance_stream,
        temperature: data.temperature,
        weather: data.weather_conditions,
        location: data.location_name,
        humidity: data.humidity,
        sportType: data.sport_type,
        description: data.description,
        deviceName: data.device_name,
        gearId: data.gear_id,
        hasPhotos: data.has_photos,
        hasSegments: data.has_segments
      };

      setActivity(logEntry);

      const [photosData, segmentsData, effortsData, gearData] = await Promise.all([
        stravaRichDataService.getActivityPhotos(id),
        stravaRichDataService.getActivitySegments(id),
        stravaRichDataService.getActivityBestEfforts(id),
        logEntry.gearId ? stravaRichDataService.getGear(logEntry.gearId) : Promise.resolve(null)
      ]);

      setPhotos(photosData);
      setSegments(segmentsData);
      setBestEfforts(effortsData);
      setGear(gearData);
    } catch (error) {
      console.error('Error loading activity data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateISO: string): string {
    const date = new Date(dateISO);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatTime(dateISO: string): string {
    const date = new Date(dateISO);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  function calculatePace(km: number, minutes: number): string {
    if (km === 0) return '--';
    const paceMin = minutes / km;
    const mins = Math.floor(paceMin);
    const secs = Math.round((paceMin - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}/km`;
  }

  const terrainAnalysis = useMemo(() => {
    if (!activity || !activity.distanceStream || !activity.elevationStream) {
      return null;
    }

    const distanceStream = Array.isArray(activity.distanceStream)
      ? activity.distanceStream
      : JSON.parse(activity.distanceStream as any);
    const elevationStream = Array.isArray(activity.elevationStream)
      ? activity.elevationStream
      : JSON.parse(activity.elevationStream as any);

    return analyzeTerrainFromStreams(
      distanceStream,
      elevationStream,
      activity.durationMin,
      activity.elevationGain
    );
  }, [activity]);

  const performanceAnalysis = useMemo(() => {
    if (!activity || !activity.distanceStream || !activity.durationMin) {
      return null;
    }

    const distanceStream = Array.isArray(activity.distanceStream)
      ? activity.distanceStream
      : JSON.parse(activity.distanceStream as any);

    const hrStream: number[] = [];

    return analyzePerformance(
      distanceStream,
      hrStream,
      activity.durationMin,
      activity.temperature,
      activity.humidity,
      terrainAnalysis || undefined
    );
  }, [activity, terrainAnalysis]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050a14]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-400">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050a14]">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Activity not found</p>
          <button
            onClick={() => navigate('/log')}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Back to Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050a14] text-white">
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/log')}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Log
        </button>

        {/* ROW 1: Header & Key Stats */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          <div className="col-span-12 bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-6 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Title Section */}
              <div className="flex-1">
                <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-white">
                  {activity.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                  {activity.sportType && (
                    <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-semibold border border-cyan-500/30">
                      {activity.sportType}
                    </span>
                  )}
                  <span>{formatDate(activity.dateISO)}</span>
                  {activity.location && (
                    <>
                      <span>•</span>
                      <span>{activity.location}</span>
                    </>
                  )}
                </div>
                {activity.description && (
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-2xl">
                    {activity.description}
                  </p>
                )}
              </div>

              {/* Right: Compact Stats Pills */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:min-w-[400px]">
                {/* Distance */}
                <div className="bg-[#0a0f1a] border border-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Distance</div>
                  <div className="text-2xl font-bold text-white">{activity.km.toFixed(2)} km</div>
                </div>

                {/* Time */}
                {activity.durationMin && (
                  <div className="bg-[#0a0f1a] border border-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Time</div>
                    <div className="text-2xl font-bold text-white">{formatDuration(activity.durationMin)}</div>
                  </div>
                )}

                {/* Pace */}
                {activity.durationMin && (
                  <div className="bg-[#0a0f1a] border border-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pace</div>
                    <div className="text-2xl font-bold text-white">{calculatePace(activity.km, activity.durationMin)}</div>
                  </div>
                )}

                {/* Elevation Gain */}
                {activity.elevationGain && (
                  <div className="bg-[#0a0f1a] border-2 border-cyan-500/50 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Elev Gain</div>
                    <div className="text-2xl font-bold text-cyan-400">↑ {activity.elevationGain.toFixed(0)} m</div>
                  </div>
                )}

                {/* Elevation Loss */}
                {activity.elevationLoss && (
                  <div className="bg-[#0a0f1a] border-2 border-orange-500/50 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Elev Loss</div>
                    <div className="text-2xl font-bold text-orange-400">↓ {Math.abs(activity.elevationLoss).toFixed(0)} m</div>
                  </div>
                )}

                {/* Heart Rate */}
                {activity.hrAvg && (
                  <div className="bg-[#0a0f1a] border border-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Avg HR</div>
                    <div className="text-2xl font-bold text-white">{activity.hrAvg} bpm</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Visual Core - Map (8) + Conditions & Impact (4) */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Left: Interactive Map with Elevation Overlay */}
          <div className="col-span-12 lg:col-span-8 bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            {(activity.mapPolyline || activity.mapSummaryPolyline) ? (
              <RouteMap
                polyline={activity.mapSummaryPolyline || activity.mapPolyline}
                width={900}
                height={500}
                durationMin={activity.durationMin}
                elevationStream={activity.elevationStream}
                distanceStream={activity.distanceStream}
                showElevation={true}
              />
            ) : (
              <div className="flex items-center justify-center h-[500px] text-slate-400">
                No map data available
              </div>
            )}
          </div>

          {/* Right: Conditions & Impact Stack */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            {/* Trail Conditions */}
            {(activity.temperature !== undefined || activity.weather || activity.humidity) && (
              <div className="bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🌤️</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Trail Conditions</h3>
                </div>
                <div className="space-y-3">
                  {activity.temperature !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">🌡️</span>
                      <span className="text-white font-semibold">{Math.round(activity.temperature)}°C</span>
                    </div>
                  )}
                  {activity.humidity !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">💧</span>
                      <span className="text-white font-semibold">{activity.humidity}%</span>
                      <span className="text-slate-400">humidity</span>
                    </div>
                  )}
                  {activity.weather && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-300">{activity.weather}</span>
                    </div>
                  )}
                  {formatTime(activity.dateISO) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">⏰</span>
                      <span className="text-slate-400">Started at</span>
                      <span className="text-white font-semibold">{formatTime(activity.dateISO)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Heat Impact */}
            {userId && activity && (
              <div className="flex-1">
                <WeatherImpactCard logEntry={activity} userId={userId} />
              </div>
            )}

            {/* Device Info */}
            {activity.deviceName && (
              <div className="bg-[#0b1221]/80 backdrop-blur-md border border-slate-700/30 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">Recorded on</div>
                <div className="text-sm text-slate-300 font-medium">{activity.deviceName}</div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 3: Technical Breakdown - Terrain (6) + Elevation Summary (6) */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Left: Terrain & Surfaces */}
          <div className="col-span-12 lg:col-span-6">
            {terrainAnalysis && (
              <ActivityTerrainBreakdown
                terrain={terrainAnalysis}
                activityElevationGain={activity?.elevationGain}
              />
            )}
          </div>

          {/* Right: Elevation Summary */}
          {activity.elevationGain && activity.elevationLoss && (
            <div className="col-span-12 lg:col-span-6 bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⛰️</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Elevation Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Total Vertical Gain</div>
                  <div className="text-3xl font-bold text-cyan-400">↑ {activity.elevationGain.toFixed(0)} m</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Total Vertical Loss</div>
                  <div className="text-3xl font-bold text-orange-400">↓ {Math.abs(activity.elevationLoss).toFixed(0)} m</div>
                </div>
                {activity.elevationLow !== undefined && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Min Elevation</div>
                    <div className="text-2xl font-bold text-white">{activity.elevationLow.toFixed(0)} m</div>
                  </div>
                )}
                {activity.elevationLow !== undefined && activity.elevationGain && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Max Elevation</div>
                    <div className="text-2xl font-bold text-white">{(activity.elevationLow + activity.elevationGain).toFixed(0)} m</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ROW 4: Performance & Segments - Performance (6) + Segments & Gear (6) */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Left: Performance Insights + Best Efforts */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            {performanceAnalysis && (
              <ActivityPerformanceInsights performance={performanceAnalysis} />
            )}
            {bestEfforts.length > 0 && (
              <div className="bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top Best Efforts</h3>
                <div className="space-y-2">
                  {bestEfforts.slice(0, 3).map((effort, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-white">{effort.name}</div>
                        <div className="text-xs text-slate-400">{(effort.distance / 1000).toFixed(2)} km</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-cyan-400">{Math.floor(effort.elapsed_time / 60)}:{(effort.elapsed_time % 60).toString().padStart(2, '0')}</div>
                        {effort.pr_rank === 1 && (
                          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">PR</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Segments + Gear */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            {segments.length > 0 && (
              <div className="bg-[#0b1221]/80 backdrop-blur-md border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top Segments</h3>
                <div className="space-y-2">
                  {segments.slice(0, 3).map((segment, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/30 last:border-0">
                      <div>
                        <div className="text-sm font-semibold text-white">{segment.name}</div>
                        <div className="text-xs text-slate-400">{(segment.distance / 1000).toFixed(2)} km</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-cyan-400">{Math.floor(segment.elapsed_time / 60)}:{(segment.elapsed_time % 60).toString().padStart(2, '0')}</div>
                        <div className="text-xs text-slate-400">Rank #{segment.rank || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gear && (
              <div className="bg-[#0b1221]/80 backdrop-blur-md border border-slate-700/30 rounded-xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Gear</h3>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">👟</div>
                  <div>
                    <div className="text-sm font-semibold text-white">{gear.name}</div>
                    <div className="text-xs text-slate-400">{(gear.distance / 1000).toFixed(0)} km total</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROW 5: Photo Gallery */}
        {photos.length > 0 && (
          <div className="mb-4">
            <ActivityPhotoGallery photos={photos} />
          </div>
        )}

        {/* Full Sections (when needed) */}
        {segments.length > 3 && (
          <div className="mb-4">
            <ActivitySegments segments={segments} />
          </div>
        )}

        {bestEfforts.length > 3 && (
          <div className="mb-4">
            <ActivityBestEfforts efforts={bestEfforts} />
          </div>
        )}

        {gear && (
          <div className="mb-4">
            <ActivityGear gear={gear} />
          </div>
        )}
      </div>
    </div>
  );
}
