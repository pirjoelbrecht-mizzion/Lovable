import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { LogEntry, ActivityPhoto } from '@/types';
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

      const photosData = await stravaRichDataService.getActivityPhotos(id);
      setPhotos(photosData);
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
      minute: '2-digit',
      hour12: true
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Activity not found</p>
          <button
            onClick={() => navigate('/log')}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Back to Log
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[500px] mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/log')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4 text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {activity.title} 💪 💪
        </h1>

        {/* Date */}
        <p className="text-xs text-blue-600 mb-4">{formatDate(activity.dateISO)}</p>

        {/* Stats List */}
        <div className="mb-6 text-sm space-y-0.5">
          <div>
            <span className="font-semibold text-gray-900">Distance</span>
          </div>
          <div className="text-gray-700">{activity.km.toFixed(2)} km</div>

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Time</span>
          </div>
          {activity.durationMin && (
            <div className="text-gray-700">{formatDuration(activity.durationMin)}</div>
          )}

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Duration</span>
          </div>
          {activity.durationMin && (
            <div className="text-gray-700">{formatDuration(activity.durationMin)}</div>
          )}

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Pace</span>
          </div>
          {activity.durationMin && (
            <div className="text-blue-600">{calculatePace(activity.km, activity.durationMin)}/km</div>
          )}

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Elev</span>
          </div>
          {activity.elevationGain && (
            <div className="text-gray-700">{activity.elevationGain.toFixed(0)} m</div>
          )}

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Avg HR</span>
          </div>
          {activity.hrAvg && (
            <div className="text-gray-700">{activity.hrAvg} bpm</div>
          )}

          <div className="mt-2">
            <span className="font-semibold text-gray-900">Started at</span>
          </div>
          <div className="text-gray-700">{formatTime(activity.dateISO)}</div>
        </div>

        {/* Trail Conditions Header */}
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-green-700">🌤️ Trail Conditions</h3>
        </div>

        {/* Main Map */}
        <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
          {(activity.mapPolyline || activity.mapSummaryPolyline) ? (
            <RouteMap
              polyline={activity.mapSummaryPolyline || activity.mapPolyline}
              width={500}
              height={300}
              durationMin={activity.durationMin}
              elevationStream={activity.elevationStream}
              distanceStream={activity.distanceStream}
              showElevation={false}
            />
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 bg-gray-50">
              No map data available
            </div>
          )}
        </div>

        {/* Zoomed Map */}
        <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
          {(activity.mapPolyline || activity.mapSummaryPolyline) ? (
            <RouteMap
              polyline={activity.mapSummaryPolyline || activity.mapPolyline}
              width={500}
              height={150}
              durationMin={activity.durationMin}
              elevationStream={activity.elevationStream}
              distanceStream={activity.distanceStream}
              showElevation={false}
            />
          ) : (
            <div className="flex items-center justify-center h-[150px] text-gray-400 bg-gray-50">
              No map data available
            </div>
          )}
        </div>

        {/* Elevation Profile */}
        {activity.elevationStream && activity.distanceStream && (
          <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 p-3">
            <RouteMap
              polyline={activity.mapSummaryPolyline || activity.mapPolyline}
              width={450}
              height={100}
              durationMin={activity.durationMin}
              elevationStream={activity.elevationStream}
              distanceStream={activity.distanceStream}
              showElevation={true}
              showMap={false}
            />
          </div>
        )}

        {/* Heat & Humidity Impact */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Heat & Humidity Impact</h3>

          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold text-gray-900">Level</span>
            </div>
            <div className="text-gray-700">2</div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg">▲</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg">▼</span>
            </div>

            {activity.temperature !== undefined && (
              <>
                <div className="mt-2">
                  <span className="font-semibold text-gray-900">Temp</span>
                </div>
                <div className="text-gray-700">{Math.round(activity.temperature)}°</div>
              </>
            )}

            {activity.humidity !== undefined && (
              <>
                <div className="mt-2">
                  <span className="font-semibold text-gray-900">Humid</span>
                </div>
                <div className="text-gray-700">{activity.humidity}%</div>
              </>
            )}

            <div className="mt-3 text-xs text-gray-700 leading-relaxed">
              -5% of 10 bpm slowed
              <br />
              Pace slowed 10%
              <br />
              • Recommendations for extremely hot days include hydrating at double solar coolant thingies.
            </div>
          </div>
        </div>

        {/* Terrain Breakdown */}
        {terrainAnalysis && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
              🏔️ Terrain Breakdown
            </h3>

            {terrainAnalysis.breakdown && terrainAnalysis.breakdown.length > 0 && (
              <div className="space-y-2">
                {terrainAnalysis.breakdown.map((terrain: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-700">
                    <span className="font-semibold capitalize">{terrain.type}:</span> {terrain.percentage.toFixed(1)}% ({terrain.distance.toFixed(1)} km)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Photos</h3>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-200"
                >
                  <img
                    src={photo.urls?.['600'] || photo.urls?.['2048']}
                    alt={`Activity photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
