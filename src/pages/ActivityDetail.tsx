import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LogEntry, ActivityPhoto, ActivitySegment, ActivityBestEffort, AthleteGear } from '@/types';
import { ActivityPhotoGallery } from '@/components/activity/ActivityPhotoGallery';
import RouteMap from '@/components/RouteMap';
import { stravaRichDataService } from '@/services/stravaRichDataService';
import { supabase, getCurrentUserId } from '@/lib/supabase';
import { analyzeTerrainFromStreams } from '@/engine/trailAnalysis';
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
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
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

  const getTerrainColor = (type: string) => {
    switch(type) {
      case 'flat': return 'bg-green-500';
      case 'rolling': return 'bg-blue-500';
      case 'hilly': return 'bg-orange-500';
      case 'steep': return 'bg-red-500';
      default: return 'bg-purple-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white pb-8">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Compact Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              {activity.title} 💪
            </h1>
            <p className="text-xs text-slate-400">{formatDate(activity.dateISO)}</p>
          </div>

          {/* Compact Top Stats Pills */}
          <div className="flex gap-2">
            <div className="bg-[#0a1420] border border-cyan-500/30 rounded-lg px-3 py-1.5">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Distance</div>
              <div className="text-sm font-bold text-white">{activity.km.toFixed(2)} km</div>
            </div>
            {activity.durationMin && (
              <div className="bg-[#0a1420] border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Time</div>
                <div className="text-sm font-bold text-white">{formatDuration(activity.durationMin)}</div>
              </div>
            )}
            {activity.durationMin && (
              <div className="bg-[#0a1420] border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Pace</div>
                <div className="text-sm font-bold text-white">{calculatePace(activity.km, activity.durationMin)}</div>
              </div>
            )}
            {activity.hrAvg && (
              <div className="bg-[#0a1420] border border-cyan-500/30 rounded-lg px-3 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Avg HR</div>
                <div className="text-sm font-bold text-white">{activity.hrAvg} bpm</div>
              </div>
            )}
          </div>
        </div>

        {/* Started at time */}
        <div className="flex items-center justify-end mb-4">
          <div className="bg-[#0a1420] border border-slate-700/50 rounded-md px-3 py-1 text-xs text-slate-300">
            Started at {formatTime(activity.dateISO)}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* Left Column - Map & Elevation */}
          <div className="col-span-12 lg:col-span-7 space-y-3">
            {/* Trail Conditions Header */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-lg">🌤️</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Trail Conditions</span>
            </div>

            {/* Map Card */}
            <div className="bg-[#0a1420]/60 border-2 border-cyan-500/40 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              {(activity.mapPolyline || activity.mapSummaryPolyline) ? (
                <RouteMap
                  polyline={activity.mapSummaryPolyline || activity.mapPolyline}
                  width={800}
                  height={350}
                  durationMin={activity.durationMin}
                  elevationStream={activity.elevationStream}
                  distanceStream={activity.distanceStream}
                  showElevation={false}
                />
              ) : (
                <div className="flex items-center justify-center h-[350px] text-slate-400">
                  No map data available
                </div>
              )}
            </div>

            {/* Elevation Profile Card */}
            {activity.elevationStream && activity.distanceStream && (
              <div className="bg-[#0a1420]/60 border-2 border-cyan-500/40 rounded-xl p-3 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <RouteMap
                  polyline={activity.mapSummaryPolyline || activity.mapPolyline}
                  width={800}
                  height={120}
                  durationMin={activity.durationMin}
                  elevationStream={activity.elevationStream}
                  distanceStream={activity.distanceStream}
                  showElevation={true}
                  showMap={false}
                />
              </div>
            )}
          </div>

          {/* Right Column - Heat Impact */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-[#0a1420]/60 border-2 border-cyan-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] h-full">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6">Heat & Humidity Impact</h3>

              {/* Heat Level Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  {/* Outer Ring */}
                  <div className="w-32 h-32 rounded-full border-4 border-orange-500/30 flex items-center justify-center">
                    {/* Inner Core */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.6)]">
                      <div className="text-center">
                        <div className="text-xs text-white/80 uppercase">Level</div>
                        <div className="text-3xl font-bold text-white">2</div>
                      </div>
                    </div>
                  </div>
                  {/* Control Icons */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">
                    ▲
                  </div>
                  <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">
                    ▶
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Weather Stats */}
              <div className="flex justify-center gap-6 mb-6">
                {activity.temperature !== undefined && (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center mb-2">
                      <div>
                        <div className="text-xs text-cyan-400">Temp</div>
                        <div className="text-lg font-bold text-white">{Math.round(activity.temperature)}°</div>
                      </div>
                    </div>
                  </div>
                )}
                {activity.humidity !== undefined && (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-500/40 flex items-center justify-center mb-2">
                      <div>
                        <div className="text-xs text-cyan-400">Humid</div>
                        <div className="text-lg font-bold text-white">{activity.humidity}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Impact Indicators */}
              <div className="space-y-2 mb-6">
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-center">
                  <span className="text-orange-400 font-medium">-5% of 10 bpm slowed</span>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-center">
                  <span className="text-cyan-400 font-medium">Pace slowed 10%</span>
                </div>
              </div>

              {/* Recommendations */}
              <div className="text-xs text-slate-400 leading-relaxed">
                • <span className="text-slate-300">Recommendations for extremely hot days include hydrating at double solar coolant thingies.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terrain Breakdown */}
        {terrainAnalysis && (
          <div className="mb-4">
            <div className="bg-[#0a1420]/60 border-2 border-cyan-500/40 rounded-xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">🏔️ Terrain Breakdown</h3>
                <button className="text-xs text-cyan-400 hover:text-cyan-300">View All Climbs</button>
              </div>

              <div className="text-xs text-slate-400 mb-6">
                172Km from significant climb<strong>+6068</strong> trailing -medium downhills smaller climbs
                <br />
                <span className="text-cyan-400">+48% rolling terrain = +25% gain total elevation change</span>
              </div>

              {/* VAM Stats Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Flat VAM</div>
                  <div className="text-2xl font-bold text-green-400">752 m/hr</div>
                  <div className="text-[10px] text-slate-500">Moving climbing</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Average VAM</div>
                  <div className="text-2xl font-bold text-white">634 m/hr</div>
                  <div className="text-[10px] text-slate-500">All vertical meters</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Fatigue Resistance</div>
                  <div className="text-2xl font-bold text-cyan-400">7%</div>
                  <div className="text-[10px] text-slate-500">Avg rating on some</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Climb Time</div>
                  <div className="text-2xl font-bold text-white">9h 33m</div>
                  <div className="text-[10px] text-slate-500">17.4 km</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Trail Resistance</div>
                  <div className="text-2xl font-bold text-green-400">39%</div>
                  <div className="text-[10px] text-slate-500">Signifcant rough climbing</div>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs text-green-400">✓</span>
                    <span className="text-[10px] text-slate-400">Trail Technicality</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Trail Spending Force</div>
                  <div className="text-2xl font-bold text-cyan-400">95%</div>
                  <div className="text-[10px] text-slate-500">Average current on some</div>
                </div>
              </div>

              {/* Colorful Terrain Bar */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3">🏃 Terrain Breakdown</h4>
                <div className="flex h-8 rounded-full overflow-hidden border-2 border-slate-700/50 mb-2">
                  {terrainAnalysis.breakdown?.map((terrain: any, idx: number) => (
                    <div
                      key={idx}
                      className={`${getTerrainColor(terrain.type)} flex items-center justify-center`}
                      style={{ width: `${terrain.percentage}%` }}
                    >
                      {terrain.percentage > 10 && (
                        <span className="text-xs font-bold text-white drop-shadow-lg">
                          {terrain.percentage.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Terrain Legend */}
                <div className="grid grid-cols-5 gap-2 text-[10px]">
                  {terrainAnalysis.breakdown?.map((terrain: any, idx: number) => (
                    <div key={idx} className="text-center">
                      <div className={`w-3 h-3 ${getTerrainColor(terrain.type)} rounded-full inline-block mb-1`} />
                      <div className="text-white font-semibold capitalize">{terrain.type} ({terrain.percentage.toFixed(0)}%)</div>
                      <div className="text-slate-400">{terrain.distance.toFixed(1)} km</div>
                      {terrain.vam && (
                        <div className="text-slate-400">{terrain.vam.toFixed(0)} m/hr</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trail Technicality Warning */}
        <div className="bg-yellow-500/10 border-2 border-yellow-500/40 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-xs font-bold text-yellow-400 mb-2">Trail Technicality</div>
              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                Some technical terrain, moderate trail flow; no prolonged sections that bring significant effort, and technical challenges spread well throughout to keep engaged.
              </p>
              <p className="text-xs text-slate-400">
                💬 Highly technical terrain heavily downhill. Practice Good managing cautious speed via conditions!
              </p>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {photos.slice(0, 8).map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square bg-[#0a1420]/60 border border-cyan-500/30 rounded-lg overflow-hidden"
              >
                <img
                  src={photo.urls?.['600'] || photo.urls?.['2048']}
                  alt={`Activity photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
