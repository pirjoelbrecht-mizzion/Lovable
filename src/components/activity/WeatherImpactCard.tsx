import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, Flame, Clock } from 'lucide-react';
import { analyzeActivityHeatImpact } from '../../lib/environmental-analysis/analyzeHeatImpact';
import { supabase } from '../../lib/supabase';
import { backfillSingleActivity } from '../../utils/backfillActivityStreams';
import { WeatherImpactCardCosmic } from '../cosmic/WeatherImpactCardCosmic';
import { HeatImpactHeader } from './HeatImpact/HeatImpactHeader';
import { HeatMetricCard } from './HeatImpact/HeatMetricCard';
import { HeatTimelineChart } from './HeatImpact/HeatTimelineChart';
import { HeatEventAlert } from './HeatImpact/HeatEventAlert';
import { HeatRecommendationCard } from './HeatImpact/HeatRecommendationCard';
import type { LogEntry } from '../../types';

interface HeatMetrics {
  heat_impact_score: number;
  humidity_strain_score: number;
  overall_severity: string;
  avg_temperature_c: number;
  max_temperature_c: number;
  avg_humidity_percent: number;
  max_humidity_percent: number;
  avg_heat_index_c: number;
  time_in_danger_zone_minutes: number;
  hr_drift_detected: boolean;
  pace_degradation_detected: boolean;
  heat_stress_timeline?: Array<{ km: number; heatStress: number }>;
}

interface AIInsights {
  summary: string;
  key_events: Array<{ km: number; description: string; severity: string; icon?: string }>;
  recommendations: string[];
  recommendation_categories?: {
    hydration?: string[];
    pacing?: string[];
    cooling?: string[];
    clothing?: string[];
    acclimation?: string[];
  };
}

interface WeatherImpactCardProps {
  logEntry: LogEntry;
  userId: string;
}

export function WeatherImpactCard({ logEntry, userId }: WeatherImpactCardProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [metrics, setMetrics] = useState<HeatMetrics | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHeatImpactData();
  }, [logEntry.id]);

  async function loadHeatImpactData() {
    setLoading(true);
    setError(null);

    try {
      // Get metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('race_heat_stress_metrics')
        .select('*')
        .eq('log_entry_id', logEntry.id)
        .maybeSingle();

      if (metricsError) throw metricsError;

      if (metricsData) {
        // Get first weather data point to show location
        const { data: weatherPoint } = await supabase
          .from('race_weather_raw')
          .select('hour_timestamp')
          .eq('log_entry_id', logEntry.id)
          .order('hour_timestamp')
          .limit(1)
          .maybeSingle();

        if (weatherPoint) {
          console.log('[Weather] Using weather data from:', weatherPoint.hour_timestamp);
        }

        setMetrics(metricsData);

        const { data: insightsData, error: insightsError } = await supabase
          .from('race_heat_ai_insights')
          .select('*')
          .eq('log_entry_id', logEntry.id)
          .maybeSingle();

        if (insightsError) throw insightsError;

        if (insightsData) {
          setInsights({
            summary: insightsData.summary,
            key_events: insightsData.key_events || [],
            recommendations: insightsData.recommendations || [],
            recommendation_categories: insightsData.recommendation_categories || undefined
          });
        }
      }
    } catch (err) {
      console.error('Failed to load heat impact data:', err);
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchGPS() {
    if (logEntry.source !== 'strava') {
      setError('GPS streams are only available for Strava activities');
      return;
    }

    setFetchingGPS(true);
    setError(null);

    try {
      await backfillSingleActivity(logEntry.id);
      setError(null);
      // Try analyzing again after fetching GPS
      await handleAnalyze();
    } catch (err: any) {
      console.error('Failed to fetch GPS:', err);
      setError(err.message || 'Failed to fetch GPS data');
    } finally {
      setFetchingGPS(false);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeActivityHeatImpact(userId, logEntry);

      if (result.success) {
        await loadHeatImpactData();
      } else {
        setError(result.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Failed to analyze activity');
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    const isGPSError = error?.includes('GPS data') || error?.includes('location');
    const isStravaActivity = logEntry.source === 'strava';

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Heat & Humidity Impact
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Analyze how environmental conditions affected your performance
        </p>

        <div className="flex flex-wrap gap-3">
          {isGPSError && isStravaActivity && (
            <button
              onClick={handleFetchGPS}
              disabled={fetchingGPS}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetchingGPS ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching GPS...
                </span>
              ) : (
                'Fetch GPS Data'
              )}
            </button>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || fetchingGPS}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Weather Impact'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">
              {isGPSError ? 'GPS Data Required' : 'Analysis Error'}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              {error}
            </p>
            {isGPSError && isStravaActivity && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
                Click "Fetch GPS Data" above to download detailed GPS streams from Strava for this activity.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const severity = (metrics.overall_severity as 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME') || 'MODERATE';
  const timeline = metrics.heat_stress_timeline || [];

  // Flatten all recommendations from categories into single array
  const recommendationCategories = insights?.recommendation_categories || {};
  const flattenedRecommendations: string[] = [];

  if (recommendationCategories.hydration) flattenedRecommendations.push(...recommendationCategories.hydration);
  if (recommendationCategories.pacing) flattenedRecommendations.push(...recommendationCategories.pacing);
  if (recommendationCategories.cooling) flattenedRecommendations.push(...recommendationCategories.cooling);
  if (recommendationCategories.acclimation) flattenedRecommendations.push(...recommendationCategories.acclimation);
  if (recommendationCategories.clothing) flattenedRecommendations.push(...recommendationCategories.clothing);

  // If no categorized recommendations, use flat list
  const recommendations = flattenedRecommendations.length > 0
    ? flattenedRecommendations
    : insights?.recommendations || [];

  // Map key events to proper structure with icon types
  const events = (insights?.key_events || []).map(event => {
    let icon: 'hr_drift' | 'warning' | 'hydration' | 'pace_drop' | 'default' = 'default';

    if (event.icon === 'zap' || event.description.toLowerCase().includes('hr')) {
      icon = 'hr_drift';
    } else if (event.description.toLowerCase().includes('pace') || event.description.toLowerCase().includes('slow')) {
      icon = 'pace_drop';
    } else if (event.description.toLowerCase().includes('hydrat') || event.description.toLowerCase().includes('drink')) {
      icon = 'hydration';
    } else if (event.severity === 'HIGH' || event.severity === 'EXTREME') {
      icon = 'warning';
    }

    return {
      icon,
      distance_km: event.km,
      description: event.description,
      severity: event.severity as 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME'
    };
  });

  // Transform data for cosmic component (keep Celsius)
  const cosmicData = {
    overallScore: metrics.heat_impact_score,
    severity: severity,
    avgTemperature: metrics.avg_temperature_c,
    avgHumidity: metrics.avg_humidity_percent,
    heatIndex: metrics.avg_heat_index_c || metrics.avg_temperature_c,
    dangerZoneMinutes: metrics.time_in_danger_zone_minutes,
    timeline: timeline.map((point) => ({
      distance: point.km,
      heatStress: point.heatStress,
      hr: undefined
    })),
    events: events,
    recommendations: recommendations
  };

  return (
    <WeatherImpactCardCosmic
      data={cosmicData}
      showTimeline={timeline.length > 0}
    />
  );
}
