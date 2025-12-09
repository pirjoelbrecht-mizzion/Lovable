/**
 * LLM Insight Service for Heat Impact Analysis
 *
 * Generates natural language insights using OpenAI GPT-4o-mini
 */

import type { PhysiologicalStress } from '../lib/environmental-analysis/stressDetection';
import type { EnvironmentalCorrelation } from '../lib/environmental-analysis/correlationEngine';
import type { HeatImpactScore } from '../lib/environmental-analysis/impactScoring';
import type { WeatherPoint } from '../lib/environmental-analysis/heatMetrics';

export interface LLMInsightRequest {
  activity_name: string;
  distance_km: number;
  duration_minutes: number;
  weatherStream: WeatherPoint[];
  physiologicalStress: PhysiologicalStress;
  correlation: EnvironmentalCorrelation;
  heatImpactScore: HeatImpactScore;
  athleteContext?: {
    heat_tolerance_level?: string;
    recent_heat_exposure?: string;
    race_experience_level?: string;
  };
}

export interface LLMInsightResponse {
  summary: string;
  key_events: Array<{
    km: number;
    description: string;
    severity: 'low' | 'moderate' | 'high';
  }>;
  recommendations: string[];
  llm_metadata: {
    model: string;
    tokens_used: number;
    cost_usd: number;
  };
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 800;
const TOKEN_COST_PER_1K_INPUT = 0.00015;
const TOKEN_COST_PER_1K_OUTPUT = 0.0006;

/**
 * Generates AI insights for heat impact analysis
 */
export async function generateHeatImpactInsights(
  request: LLMInsightRequest
): Promise<LLMInsightResponse> {
  // If no API key configured, skip LLM call and use fallback
  if (!OPENAI_API_KEY) {
    console.log('[LLM Insights] No API key configured, using fallback insights');
    return generateFallbackInsights(request);
  }

  // Build structured prompt
  const prompt = buildPrompt(request);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an expert endurance sports coach specializing in heat adaptation and environmental performance factors. Analyze the provided data and generate concise, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    const tokensUsed = data.usage.total_tokens;
    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;

    const cost =
      (inputTokens / 1000) * TOKEN_COST_PER_1K_INPUT +
      (outputTokens / 1000) * TOKEN_COST_PER_1K_OUTPUT;

    return {
      summary: parsed.summary || '',
      key_events: parsed.key_events || [],
      recommendations: parsed.recommendations || [],
      llm_metadata: {
        model: MODEL,
        tokens_used: tokensUsed,
        cost_usd: cost
      }
    };
  } catch (error) {
    console.error('Failed to generate LLM insights:', error);

    // Return fallback template-based insights
    return generateFallbackInsights(request);
  }
}

/**
 * Builds structured prompt for LLM
 */
function buildPrompt(request: LLMInsightRequest): string {
  const {
    activity_name,
    distance_km,
    duration_minutes,
    weatherStream,
    physiologicalStress,
    correlation,
    heatImpactScore,
    athleteContext
  } = request;

  // Sample weather data (every ~10 data points to reduce prompt size)
  const sampledWeather = sampleWeatherStream(weatherStream, 20);

  const weatherSummary = sampledWeather
    .map(
      w =>
        `km ${(w.km || 0).toFixed(1)}: ${w.temperature_c.toFixed(1)}°C, ${w.humidity_percent.toFixed(0)}% humidity, heat index ${w.heat_index_c.toFixed(1)}°C`
    )
    .join('\n');

  const physiologicalSummary = buildPhysiologicalSummary(physiologicalStress);
  const correlationSummary = correlation.summary;

  const prompt = `
Analyze this ultramarathon/trail running activity for heat and humidity impact:

**Activity**: ${activity_name}
**Distance**: ${distance_km.toFixed(1)} km
**Duration**: ${duration_minutes.toFixed(0)} minutes

**Heat Impact Score**: ${heatImpactScore.overall_score}/100 (${heatImpactScore.severity})

**Weather Conditions** (sampled):
${weatherSummary}

**Physiological Stress Detected**:
${physiologicalSummary}

**Environmental Correlation**:
${correlationSummary}
Correlation Strength: ${(correlation.correlation_strength * 100).toFixed(0)}%
Primary Factor: ${correlation.primary_factor}

${athleteContext ? `**Athlete Context**:
Heat Tolerance: ${athleteContext.heat_tolerance_level || 'Unknown'}
Recent Heat Exposure: ${athleteContext.recent_heat_exposure || 'Unknown'}
Experience: ${athleteContext.race_experience_level || 'Unknown'}` : ''}

**Task**: Generate a JSON response with:
1. "summary": A concise 2-3 sentence summary of how heat/humidity affected performance
2. "key_events": Array of 2-4 significant moments (km, description, severity: low/moderate/high)
3. "recommendations": Array of 3-5 specific, actionable recommendations for future similar conditions

Focus on:
- Specific kilometer markers where environmental impact was most notable
- Correlation between environmental conditions and performance metrics
- Practical strategies for heat adaptation and race-day management

Return valid JSON only.
`;

  return prompt;
}

/**
 * Samples weather stream to reduce prompt size
 */
function sampleWeatherStream(
  weatherStream: WeatherPoint[],
  targetSamples: number
): Array<WeatherPoint & { km?: number }> {
  if (weatherStream.length <= targetSamples) {
    return weatherStream.map((w, i) => ({ ...w, km: i / weatherStream.length * 100 }));
  }

  const step = Math.floor(weatherStream.length / targetSamples);
  const sampled: Array<WeatherPoint & { km?: number }> = [];

  for (let i = 0; i < weatherStream.length; i += step) {
    sampled.push({
      ...weatherStream[i],
      km: (i / weatherStream.length) * 100 // Approximate km position
    });
  }

  return sampled;
}

/**
 * Builds physiological summary text
 */
function buildPhysiologicalSummary(stress: PhysiologicalStress): string {
  const items: string[] = [];

  if (stress.hr_drift.detected) {
    items.push(
      `- HR Drift: ${stress.hr_drift.magnitude_bpm.toFixed(1)} bpm increase starting at km ${stress.hr_drift.start_km.toFixed(1)}${
        stress.hr_drift.sustained ? ' (sustained)' : ''
      }`
    );
  }

  if (stress.pace_degradation.detected) {
    items.push(
      `- Pace Degradation: ${stress.pace_degradation.degradation_percent.toFixed(1)}% slowdown starting at km ${stress.pace_degradation.start_km.toFixed(1)}`
    );
  }

  if (stress.vam_decline.detected) {
    items.push(
      `- VAM Decline: ${stress.vam_decline.decline_percent.toFixed(1)}% reduction in climbing efficiency`
    );
  }

  if (stress.cadence_drop.detected) {
    items.push(
      `- Cadence Drop: ${stress.cadence_drop.drop_percent.toFixed(1)}% reduction starting at km ${stress.cadence_drop.start_km.toFixed(1)}`
    );
  }

  if (items.length === 0) {
    return '- No significant physiological stress detected';
  }

  return items.join('\n');
}

/**
 * Generates template-based fallback insights
 */
function generateFallbackInsights(request: LLMInsightRequest): LLMInsightResponse {
  const { heatImpactScore, correlation, physiologicalStress, distance_km } = request;

  let summary = '';

  if (heatImpactScore.severity === 'EXTREME' || heatImpactScore.severity === 'HIGH') {
    summary = `This activity experienced significant heat stress with a heat impact score of ${heatImpactScore.overall_score}/100. Environmental conditions likely contributed to ${correlation.primary_factor.toLowerCase()} stress, affecting performance throughout the effort.`;
  } else if (heatImpactScore.severity === 'MODERATE') {
    summary = `Moderate heat impact detected (score: ${heatImpactScore.overall_score}/100). Environmental conditions were challenging but manageable, with some performance effects observed.`;
  } else {
    summary = `Minimal heat impact on this activity (score: ${heatImpactScore.overall_score}/100). Environmental conditions were favorable for performance.`;
  }

  const key_events: LLMInsightResponse['key_events'] = [];

  if (physiologicalStress.hr_drift.detected) {
    key_events.push({
      km: physiologicalStress.hr_drift.start_km,
      description: `HR drift of ${physiologicalStress.hr_drift.magnitude_bpm.toFixed(0)} bpm detected`,
      severity: physiologicalStress.hr_drift.magnitude_bpm > 15 ? 'high' : 'moderate'
    });
  }

  if (physiologicalStress.pace_degradation.detected) {
    key_events.push({
      km: physiologicalStress.pace_degradation.start_km,
      description: `Pace slowed by ${physiologicalStress.pace_degradation.degradation_percent.toFixed(0)}%`,
      severity: physiologicalStress.pace_degradation.degradation_percent > 20 ? 'high' : 'moderate'
    });
  }

  const recommendations = [
    'Consider heat acclimation training for similar conditions',
    'Monitor hydration and electrolyte intake more carefully',
    'Adjust pacing strategy for hot/humid conditions'
  ];

  if (heatImpactScore.cooling_benefit_score > 30) {
    recommendations.push('Leverage elevation gains for cooling and recovery');
  }

  return {
    summary,
    key_events,
    recommendations,
    llm_metadata: {
      model: 'fallback-template',
      tokens_used: 0,
      cost_usd: 0
    }
  };
}

/**
 * Caches insights in database
 */
export async function cacheInsightsInDatabase(
  userId: string,
  logEntryId: string,
  insights: LLMInsightResponse
): Promise<void> {
  const { supabase } = await import('../lib/supabase');

  const { error } = await supabase.from('race_heat_ai_insights').upsert({
    user_id: userId,
    log_entry_id: logEntryId,
    summary: insights.summary,
    key_events: insights.key_events,
    recommendations: insights.recommendations,
    llm_model: insights.llm_metadata.model,
    llm_tokens_used: insights.llm_metadata.tokens_used,
    llm_cost_usd: insights.llm_metadata.cost_usd,
    updated_at: new Date().toISOString()
  });

  if (error) {
    console.error('Failed to cache insights:', error);
    throw error;
  }
}
