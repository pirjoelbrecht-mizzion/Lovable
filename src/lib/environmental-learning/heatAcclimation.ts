/**
 * Heat Acclimation Protocol Recommendations
 *
 * Provides science-based heat acclimation strategies based on:
 * - Current heat tolerance level
 * - Target race conditions
 * - Training phase
 * - Available time before race
 */

import { supabase, getCurrentUserId } from '@/lib/supabase';

export interface HeatAcclimationProtocol {
  phase: 'none' | 'initial' | 'adaptation' | 'maintenance';
  durationWeeks: number;
  weeklyPlan: AcclimationWeek[];
  recommendations: string[];
  warnings: string[];
  targetHeatIndex: number;
  currentTolerance: number;
}

export interface AcclimationWeek {
  weekNumber: number;
  sessions: AcclimationSession[];
  progressionNote: string;
}

export interface AcclimationSession {
  day: string;
  duration: number; // minutes
  intensity: 'easy' | 'moderate';
  targetHeatIndex: number;
  notes: string[];
}

/**
 * Generate heat acclimation protocol based on athlete's current tolerance
 * and target race conditions
 */
export async function generateHeatAcclimationProtocol(
  targetRaceDate: string,
  targetHeatIndex: number,
  targetLocation: string
): Promise<HeatAcclimationProtocol> {
  const currentTolerance = await estimateCurrentHeatTolerance();
  const weeksUntilRace = Math.floor(
    (new Date(targetRaceDate).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
  );

  // Need at least 10 days for minimal adaptation, 14-21 days optimal
  if (weeksUntilRace < 2) {
    return {
      phase: 'none',
      durationWeeks: 0,
      weeklyPlan: [],
      recommendations: [
        'Insufficient time for full heat acclimation',
        'Focus on heat management strategies instead:',
        '• Pre-cooling (ice vest, cold fluids)',
        '• Aggressive early hydration',
        '• Realistic pace expectations',
        '• Early morning start if possible'
      ],
      warnings: [
        'Heat acclimation requires minimum 10-14 days',
        'Attempting to train hard in heat without adaptation increases injury risk'
      ],
      targetHeatIndex: targetHeatIndex,
      currentTolerance
    };
  }

  const toleranceGap = targetHeatIndex - currentTolerance;
  const needsAcclimation = toleranceGap > 10;

  if (!needsAcclimation) {
    return {
      phase: 'maintenance',
      durationWeeks: Math.min(weeksUntilRace, 4),
      weeklyPlan: generateMaintenancePlan(),
      recommendations: [
        'Current heat tolerance is adequate',
        'Maintain with 2-3 heat sessions per week',
        'Focus on race-specific training'
      ],
      warnings: [],
      targetHeatIndex,
      currentTolerance
    };
  }

  const protocol = weeksUntilRace >= 4
    ? generateFullProtocol(currentTolerance, targetHeatIndex, weeksUntilRace)
    : generateRapidProtocol(currentTolerance, targetHeatIndex, weeksUntilRace);

  return protocol;
}

/**
 * Estimate current heat tolerance from recent training history
 */
async function estimateCurrentHeatTolerance(): Promise<number> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return 60; // Default: moderate tolerance

    // Get recent activities (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const { data: activities } = await supabase
      .from('log_entries')
      .select('id, date')
      .eq('user_id', userId)
      .gte('date', fourWeeksAgo.toISOString().slice(0, 10))
      .order('date', { ascending: false });

    if (!activities || activities.length === 0) return 60;

    // Get heat stress data for these activities
    const activityIds = activities.map(a => a.id);
    const { data: heatData } = await supabase
      .from('race_heat_stress_metrics')
      .select('heat_impact_score, overall_severity')
      .in('log_entry_id', activityIds)
      .order('heat_impact_score', { ascending: false })
      .limit(5); // Top 5 hottest runs

    if (!heatData || heatData.length === 0) return 60;

    // Current tolerance is roughly the average of top 5 heat exposures
    // with a slight penalty (most people tolerate trained conditions better than race day)
    const avgTopExposure = heatData.reduce((sum, d) => sum + d.heat_impact_score, 0) / heatData.length;
    return Math.round(avgTopExposure * 0.9); // 10% penalty for race day nerves
  } catch (error) {
    console.error('Error estimating heat tolerance:', error);
    return 60;
  }
}

/**
 * Full 4-6 week heat acclimation protocol
 */
function generateFullProtocol(
  currentTolerance: number,
  targetHeatIndex: number,
  weeksAvailable: number
): HeatAcclimationProtocol {
  const weeks = Math.min(weeksAvailable - 1, 6); // Leave 1 week for taper
  const weeklyPlan: AcclimationWeek[] = [];

  // Progressive exposure plan
  for (let week = 1; week <= weeks; week++) {
    const progressionFactor = week / weeks;
    const targetHI = currentTolerance + (targetHeatIndex - currentTolerance) * progressionFactor;

    if (week <= 2) {
      // Initial adaptation phase: frequent short sessions
      weeklyPlan.push({
        weekNumber: week,
        sessions: [
          {
            day: 'Monday',
            duration: 30,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHI * 0.7),
            notes: ['Start conservatively', 'Monitor HR carefully']
          },
          {
            day: 'Wednesday',
            duration: 40,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHI * 0.8),
            notes: ['Slightly longer duration', 'Stay in Zone 2']
          },
          {
            day: 'Friday',
            duration: 45,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHI * 0.85),
            notes: ['Finish with 5min moderate pace']
          },
          {
            day: 'Sunday',
            duration: 50,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHI * 0.9),
            notes: ['Longer easy run in heat']
          }
        ],
        progressionNote: week === 1
          ? 'Initial exposure - expect elevated HR and perceived effort'
          : 'Body begins adapting - plasma volume increases'
      });
    } else if (week <= 4) {
      // Core adaptation phase: longer sessions with intensity
      weeklyPlan.push({
        weekNumber: week,
        sessions: [
          {
            day: 'Tuesday',
            duration: 45,
            intensity: 'moderate',
            targetHeatIndex: Math.round(targetHI),
            notes: ['Include 3x5min at tempo', 'Monitor for dizziness']
          },
          {
            day: 'Thursday',
            duration: 60,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHI),
            notes: ['Steady long run in heat']
          },
          {
            day: 'Saturday',
            duration: 40,
            intensity: 'moderate',
            targetHeatIndex: Math.round(targetHI),
            notes: ['Race-specific intervals']
          }
        ],
        progressionNote: 'Peak adaptation phase - sweat rate increases, HR normalizes'
      });
    } else {
      // Maintenance phase: race-specific
      weeklyPlan.push({
        weekNumber: week,
        sessions: [
          {
            day: 'Tuesday',
            duration: 50,
            intensity: 'moderate',
            targetHeatIndex: Math.round(targetHeatIndex),
            notes: ['Race pace segments', 'Practice nutrition']
          },
          {
            day: 'Friday',
            duration: 40,
            intensity: 'easy',
            targetHeatIndex: Math.round(targetHeatIndex),
            notes: ['Maintain adaptations']
          }
        ],
        progressionNote: 'Maintenance - adaptations fully established'
      });
    }
  }

  return {
    phase: 'adaptation',
    durationWeeks: weeks,
    weeklyPlan,
    recommendations: [
      'Heat acclimation is highly individual - monitor your response',
      'Hydrate aggressively: +500ml/hour in heat',
      'Increase sodium intake: 500-700mg/hour',
      'Expect 6-10 bpm higher HR initially',
      'Full adaptation takes 10-14 days',
      'Benefits decay after 2-3 weeks without heat exposure',
      'Consider portable heat: hot bath, sauna, overdressing'
    ],
    warnings: [
      'Stop immediately if experiencing nausea, dizziness, or confusion',
      'Never train alone in extreme heat',
      'HR above 90% max in easy pace = stop and cool down',
      'Weight loss >2% body weight = inadequate hydration'
    ],
    targetHeatIndex,
    currentTolerance
  };
}

/**
 * Rapid 2-3 week heat acclimation protocol
 */
function generateRapidProtocol(
  currentTolerance: number,
  targetHeatIndex: number,
  weeksAvailable: number
): HeatAcclimationProtocol {
  const weeks = Math.min(weeksAvailable - 1, 3);
  const weeklyPlan: AcclimationWeek[] = [];

  // Aggressive but safe protocol for limited time
  for (let week = 1; week <= weeks; week++) {
    const progressionFactor = week / weeks;
    const targetHI = currentTolerance + (targetHeatIndex - currentTolerance) * progressionFactor;

    weeklyPlan.push({
      weekNumber: week,
      sessions: [
        {
          day: 'Monday',
          duration: 40,
          intensity: 'easy',
          targetHeatIndex: Math.round(targetHI * 0.8),
          notes: ['Start conservative']
        },
        {
          day: 'Tuesday',
          duration: 30,
          intensity: 'easy',
          targetHeatIndex: Math.round(targetHI * 0.85),
          notes: ['Back-to-back heat stimulus']
        },
        {
          day: 'Wednesday',
          duration: 45,
          intensity: week === 1 ? 'easy' : 'moderate',
          targetHeatIndex: Math.round(targetHI * 0.9),
          notes: week === 1 ? ['Slightly longer'] : ['Add race pace segments']
        },
        {
          day: 'Friday',
          duration: 50,
          intensity: 'easy',
          targetHeatIndex: Math.round(targetHI),
          notes: ['Longer exposure']
        },
        {
          day: 'Sunday',
          duration: 40,
          intensity: 'moderate',
          targetHeatIndex: Math.round(targetHeatIndex),
          notes: ['Race-specific effort']
        }
      ],
      progressionNote: week === 1
        ? 'Rapid initial adaptation - daily heat exposure'
        : week === 2
        ? 'Core adaptation phase - add intensity'
        : 'Final adaptation week'
    });
  }

  return {
    phase: 'initial',
    durationWeeks: weeks,
    weeklyPlan,
    recommendations: [
      'RAPID PROTOCOL - More frequent sessions required',
      'Daily heat exposure for first 5-7 days critical',
      'Consider 2x/day if time very limited: morning + hot bath',
      'Aggressive hydration essential',
      'Monitor recovery carefully - reduce volume if needed',
      'Portable heat options: sauna, hot bath (40°C), overdressing'
    ],
    warnings: [
      'Rapid acclimation increases fatigue - reduce total training volume',
      'Higher risk of overtraining - prioritize recovery',
      'Daily sessions are demanding - listen to your body',
      'If race is <10 days away, focus on heat management instead'
    ],
    targetHeatIndex,
    currentTolerance
  };
}

/**
 * Maintenance protocol for already-acclimated athletes
 */
function generateMaintenancePlan(): AcclimationWeek[] {
  return [
    {
      weekNumber: 1,
      sessions: [
        {
          day: 'Tuesday',
          duration: 45,
          intensity: 'moderate',
          targetHeatIndex: 75,
          notes: ['Maintain adaptations with intensity']
        },
        {
          day: 'Friday',
          duration: 40,
          intensity: 'easy',
          targetHeatIndex: 70,
          notes: ['Easy heat exposure']
        }
      ],
      progressionNote: 'Maintain current heat tolerance - 2 sessions/week sufficient'
    }
  ];
}

/**
 * Get personalized heat training recommendations for today
 */
export async function getHeatTrainingRecommendation(
  plannedDuration: number,
  plannedIntensity: 'easy' | 'moderate' | 'hard',
  forecastHeatIndex: number
): Promise<{
  goAhead: boolean;
  adjustments: string[];
  alternatives: string[];
}> {
  const tolerance = await estimateCurrentHeatTolerance();
  const heatStress = forecastHeatIndex - tolerance;

  if (heatStress < 10) {
    return {
      goAhead: true,
      adjustments: ['Conditions within tolerance', 'Train as planned'],
      alternatives: []
    };
  }

  if (heatStress < 20) {
    return {
      goAhead: true,
      adjustments: [
        'Moderate heat stress expected',
        'Add 500ml extra hydration',
        'Reduce intensity 5-10% or duration 10-15%',
        'Start conservatively - HR will be elevated'
      ],
      alternatives: ['Shift to early morning if possible']
    };
  }

  return {
    goAhead: plannedIntensity === 'easy',
    adjustments: [
      'High heat stress - significant modifications needed',
      'Reduce duration by 25-30%',
      'Easy pace ONLY - no quality work',
      'Hydrate 1L before, 500ml/30min during',
      'Consider stopping early if HR uncontrolled'
    ],
    alternatives: [
      'Move to early morning (before 7am)',
      'Indoor training (treadmill with fan)',
      'Alternative training (pool running, cycling)',
      'Rest day if not race-critical'
    ]
  };
}
