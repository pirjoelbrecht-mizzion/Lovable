import { useState, useEffect } from 'react';
import { getEventRouteAnalysis } from '@/lib/gpxStorage';
import type { GPXRouteAnalysis } from '@/utils/gpxParser';

export function useEventRouteData(eventId: string | undefined) {
  const [routeData, setRouteData] = useState<{
    analysis: GPXRouteAnalysis | null;
    gpxUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setRouteData(null);
      return;
    }

    loadRouteData();
  }, [eventId]);

  async function loadRouteData() {
    if (!eventId) return;

    setLoading(true);
    try {
      const data = await getEventRouteAnalysis(eventId);
      if (data && data.route_analysis) {
        setRouteData({
          analysis: data.route_analysis as GPXRouteAnalysis,
          gpxUrl: data.gpx_file_url,
        });
      } else {
        setRouteData(null);
      }
    } catch (err) {
      console.error('Error loading route data:', err);
      setRouteData(null);
    } finally {
      setLoading(false);
    }
  }

  return { routeData, loading };
}
