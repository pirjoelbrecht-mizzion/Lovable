import React, { useState, useEffect } from 'react';
import { analyzeActivityHeatImpact } from '../../lib/environmental-analysis/analyzeHeatImpact';
import { supabase } from '../../lib/supabase';
import type { LogEntry } from '../../types';

interface HeatMetrics {
  heat_impact_score: number;
  humidity_strain_score: number;
  overall_severity: string;
  avg_temperature_c: number;
  max_temperature_c: number;
  avg_humidity_percent: number;
  max_humidity_percent: number;
  time_in_danger_zone_minutes: number;
  hr_drift_detected: boolean;
  pace_degradation_detected: boolean;
}

interface AIInsights {
  summary: string;
  key_events: Array<{ km: number; description: string; severity: string }>;
  recommendations: string[];
}

interface WeatherImpactCardProps {
  logEntry: LogEntry;
  userId: string;
}

export function WeatherImpactCard({ logEntry, userId }: WeatherImpactCardProps) {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
      const { data: metricsData, error: metricsError } = await supabase
        .from('race_heat_stress_metrics')
        .select('*')
        .eq('log_entry_id', logEntry.id)
        .maybeSingle();

      if (metricsError) throw metricsError;

      if (metricsData) {
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
            recommendations: insightsData.recommendations || []
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
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
          Heat & Humidity Impact
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Analyze how environmental conditions affected your performance
        </p>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
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
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  const severityColor = {
    LOW: 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    MODERATE: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
    HIGH: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
    EXTREME: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
  }[metrics.overall_severity] || 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Heat & Humidity Impact
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${severityColor}`}>
          {metrics.overall_severity}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {metrics.heat_impact_score}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Heat Impact Score
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {Math.round(metrics.avg_temperature_c)}°C
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Avg Temperature
          </div>
        </div>

        <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
          <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
            {Math.round(metrics.avg_humidity_percent)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Avg Humidity
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {Math.round(metrics.time_in_danger_zone_minutes)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Min in Danger Zone
          </div>
        </div>
      </div>

      {insights && (
        <>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              AI Analysis
            </h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {insights.summary}
            </p>
          </div>

          {insights.key_events.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Key Events
              </h4>
              <div className="space-y-3">
                {insights.key_events.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-16 text-sm font-medium text-gray-600 dark:text-gray-400">
                      {event.km.toFixed(1)} km
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {event.description}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      event.severity === 'high'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : event.severity === 'moderate'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {event.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.recommendations.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Recommendations
              </h4>
              <ul className="space-y-2">
                {insights.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {rec}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {(metrics.hr_drift_detected || metrics.pace_degradation_detected) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            Physiological Stress Detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {metrics.hr_drift_detected && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm">
                Heart Rate Drift
              </span>
            )}
            {metrics.pace_degradation_detected && (
              <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm">
                Pace Degradation
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
