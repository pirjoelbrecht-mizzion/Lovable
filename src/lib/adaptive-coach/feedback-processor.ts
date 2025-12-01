/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — FEEDBACK PROCESSOR
 *  Module 9 — Survey Interpretation & Pattern Detection
 * ======================================================================
 *
 * This module processes athlete feedback to:
 * - Interpret subjective ratings (RPE, fatigue, motivation)
 * - Detect patterns and trends over time
 * - Identify injury risk signals
 * - Calculate performance readiness
 * - Generate actionable insights from qualitative data
 *
 * The processor uses both rule-based logic and statistical analysis
 * to extract meaningful signals from athlete self-reports.
 */

import type {
  DailyFeedback,
  WeeklyFeedback,
  AthleteProfile
} from './types';

export interface FeedbackInsight {
  type: 'positive' | 'neutral' | 'warning' | 'critical';
  category: 'recovery' | 'injury' | 'performance' | 'motivation' | 'external';
  message: string;
  confidence: number;
  dataPoints: number;
  trend?: 'improving' | 'stable' | 'declining';
  actionable: boolean;
  recommendation?: string;
}

export interface FeedbackSummary {
  period: string;
  overallScore: number;
  insights: FeedbackInsight[];
  trends: {
    fatigue: number;
    motivation: number;
    recovery: number;
    performance: number;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  readyForProgression: boolean;
}

export interface PainPattern {
  location: string;
  severity: number;
  frequency: number;
  trend: 'new' | 'stable' | 'worsening' | 'improving';
  concernLevel: 'low' | 'medium' | 'high';
  recommendation: string;
}

const FEEDBACK_THRESHOLDS = {
  FATIGUE: {
    LOW: 3,
    MEDIUM: 5,
    HIGH: 7,
    CRITICAL: 9
  },
  PAIN: {
    MINOR: 3,
    MODERATE: 5,
    SEVERE: 7,
    CRITICAL: 9
  },
  MOTIVATION: {
    CRITICAL: 2,
    LOW: 4,
    GOOD: 7
  },
  SLEEP: {
    DEFICIT: 6,
    ADEQUATE: 7,
    GOOD: 8
  },
  COMPLETION_RATE: {
    POOR: 0.5,
    CONCERNING: 0.7,
    ACCEPTABLE: 0.8,
    GOOD: 0.9
  }
} as const;

export function processDailyFeedback(
  feedback: DailyFeedback[],
  athlete: AthleteProfile
): FeedbackSummary {
  const insights: FeedbackInsight[] = [];

  if (feedback.length === 0) {
    return {
      period: 'No data',
      overallScore: 50,
      insights: [],
      trends: { fatigue: 0, motivation: 0, recovery: 0, performance: 0 },
      riskLevel: 'low',
      readyForProgression: true
    };
  }

  analyzeFatigueTrend(feedback, insights);
  analyzeRecoveryMarkers(feedback, insights);
  analyzePainPatterns(feedback, insights);
  analyzeMotivationTrend(feedback, insights);
  analyzePerformanceTrend(feedback, insights);

  const trends = calculateTrends(feedback);
  const overallScore = calculateOverallScore(insights, trends);
  const riskLevel = determineRiskLevel(insights);
  const readyForProgression = assessProgressionReadiness(insights, trends, overallScore);

  return {
    period: `${feedback[0].date} to ${feedback[feedback.length - 1].date}`,
    overallScore,
    insights,
    trends,
    riskLevel,
    readyForProgression
  };
}

function analyzeFatigueTrend(
  feedback: DailyFeedback[],
  insights: FeedbackInsight[]
): void {
  const fatigueReadings = feedback
    .filter(f => f.fatigue !== undefined)
    .map(f => f.fatigue!);

  if (fatigueReadings.length < 3) return;

  const avgFatigue = fatigueReadings.reduce((a, b) => a + b, 0) / fatigueReadings.length;
  const recentAvg = fatigueReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const earlyAvg = fatigueReadings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

  const trend = recentAvg > earlyAvg ? 'declining' : recentAvg < earlyAvg ? 'improving' : 'stable';

  if (avgFatigue >= FEEDBACK_THRESHOLDS.FATIGUE.HIGH) {
    insights.push({
      type: 'critical',
      category: 'recovery',
      message: `Chronic high fatigue detected (avg: ${avgFatigue.toFixed(1)}/10)`,
      confidence: 0.9,
      dataPoints: fatigueReadings.length,
      trend,
      actionable: true,
      recommendation: 'Implement immediate recovery week - reduce volume by 30-40%'
    });
  } else if (avgFatigue >= FEEDBACK_THRESHOLDS.FATIGUE.MEDIUM && trend === 'declining') {
    insights.push({
      type: 'warning',
      category: 'recovery',
      message: `Fatigue trending upward (${avgFatigue.toFixed(1)}/10, ${trend})`,
      confidence: 0.8,
      dataPoints: fatigueReadings.length,
      trend,
      actionable: true,
      recommendation: 'Consider adding rest day or reducing intensity this week'
    });
  } else if (trend === 'improving') {
    insights.push({
      type: 'positive',
      category: 'recovery',
      message: `Fatigue improving (${avgFatigue.toFixed(1)}/10)`,
      confidence: 0.7,
      dataPoints: fatigueReadings.length,
      trend,
      actionable: false
    });
  }
}

function analyzeRecoveryMarkers(
  feedback: DailyFeedback[],
  insights: FeedbackInsight[]
): void {
  const sleepData = feedback.filter(f => f.sleepHours !== undefined);

  if (sleepData.length >= 5) {
    const avgSleep = sleepData.reduce((sum, f) => sum + f.sleepHours!, 0) / sleepData.length;
    const avgQuality = sleepData
      .filter(f => f.sleepQuality !== undefined)
      .reduce((sum, f) => sum + f.sleepQuality!, 0) / sleepData.length || 5;

    if (avgSleep < FEEDBACK_THRESHOLDS.SLEEP.DEFICIT) {
      insights.push({
        type: 'warning',
        category: 'recovery',
        message: `Insufficient sleep (${avgSleep.toFixed(1)} hrs/night avg)`,
        confidence: 0.85,
        dataPoints: sleepData.length,
        actionable: true,
        recommendation: 'Prioritize 7-9 hours sleep - critical for recovery and adaptation'
      });
    }

    if (avgQuality <= 4) {
      insights.push({
        type: 'warning',
        category: 'recovery',
        message: `Poor sleep quality (${avgQuality.toFixed(1)}/10)`,
        confidence: 0.75,
        dataPoints: sleepData.length,
        actionable: true,
        recommendation: 'Address sleep hygiene - may need to reduce evening training load'
      });
    }
  }

  const hrvData = feedback.filter(f => f.hrv !== undefined);
  if (hrvData.length >= 7) {
    const baselineHRV = hrvData.slice(0, 7).reduce((sum, f) => sum + f.hrv!, 0) / 7;
    const recentHRV = hrvData.slice(-7).reduce((sum, f) => sum + f.hrv!, 0) / 7;
    const changePercent = ((recentHRV - baselineHRV) / baselineHRV) * 100;

    if (changePercent < -15) {
      insights.push({
        type: 'warning',
        category: 'recovery',
        message: `HRV declined ${Math.abs(changePercent).toFixed(0)}% - indicates accumulated stress`,
        confidence: 0.85,
        dataPoints: hrvData.length,
        trend: 'declining',
        actionable: true,
        recommendation: 'Add extra recovery day and reduce intensity'
      });
    } else if (changePercent > 10) {
      insights.push({
        type: 'positive',
        category: 'recovery',
        message: `HRV improved ${changePercent.toFixed(0)}% - good adaptation`,
        confidence: 0.8,
        dataPoints: hrvData.length,
        trend: 'improving',
        actionable: false
      });
    }
  }
}

function analyzePainPatterns(
  feedback: DailyFeedback[],
  insights: FeedbackInsight[]
): void {
  const painReadings = feedback.filter(f => f.pain !== undefined);

  if (painReadings.length === 0) return;

  const painAreas = new Map<string, number[]>();

  painReadings.forEach(f => {
    if (!f.pain) return;
    Object.entries(f.pain).forEach(([area, level]) => {
      if (typeof level === 'number' && level > 0) {
        if (!painAreas.has(area)) painAreas.set(area, []);
        painAreas.get(area)!.push(level);
      }
    });
  });

  painAreas.forEach((levels, area) => {
    const avgPain = levels.reduce((a, b) => a + b, 0) / levels.length;
    const maxPain = Math.max(...levels);
    const frequency = levels.length / feedback.length;

    if (maxPain >= FEEDBACK_THRESHOLDS.PAIN.SEVERE) {
      insights.push({
        type: 'critical',
        category: 'injury',
        message: `Severe ${area} pain reported (max: ${maxPain}/10)`,
        confidence: 0.95,
        dataPoints: levels.length,
        actionable: true,
        recommendation: 'Stop training and seek medical evaluation immediately'
      });
    } else if (avgPain >= FEEDBACK_THRESHOLDS.PAIN.MODERATE && frequency > 0.5) {
      insights.push({
        type: 'warning',
        category: 'injury',
        message: `Persistent ${area} discomfort (avg: ${avgPain.toFixed(1)}/10, ${(frequency * 100).toFixed(0)}% of days)`,
        confidence: 0.85,
        dataPoints: levels.length,
        actionable: true,
        recommendation: 'Reduce impact loading and consider professional assessment'
      });
    } else if (levels.length >= 3) {
      const recentTrend = levels.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const earlyTrend = levels.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

      if (recentTrend > earlyTrend * 1.5) {
        insights.push({
          type: 'warning',
          category: 'injury',
          message: `${area} pain worsening over time`,
          confidence: 0.75,
          dataPoints: levels.length,
          trend: 'declining',
          actionable: true,
          recommendation: 'Monitor closely - may need volume reduction or cross-training'
        });
      }
    }
  });
}

function analyzeMotivationTrend(
  feedback: DailyFeedback[],
  insights: FeedbackInsight[]
): void {
  const motivationReadings = feedback
    .filter(f => f.motivation !== undefined)
    .map(f => f.motivation!);

  if (motivationReadings.length < 5) return;

  const avgMotivation = motivationReadings.reduce((a, b) => a + b, 0) / motivationReadings.length;
  const recentAvg = motivationReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;

  if (avgMotivation <= FEEDBACK_THRESHOLDS.MOTIVATION.CRITICAL) {
    insights.push({
      type: 'critical',
      category: 'motivation',
      message: `Very low motivation (${avgMotivation.toFixed(1)}/10) - risk of burnout`,
      confidence: 0.8,
      dataPoints: motivationReadings.length,
      actionable: true,
      recommendation: 'Consider taking complete break or switching to fun/social runs'
    });
  } else if (avgMotivation <= FEEDBACK_THRESHOLDS.MOTIVATION.LOW) {
    insights.push({
      type: 'warning',
      category: 'motivation',
      message: `Low motivation levels (${avgMotivation.toFixed(1)}/10)`,
      confidence: 0.75,
      dataPoints: motivationReadings.length,
      actionable: true,
      recommendation: 'Vary training routine - add group runs or scenic trails'
    });
  }

  if (recentAvg < avgMotivation * 0.7) {
    insights.push({
      type: 'warning',
      category: 'motivation',
      message: 'Motivation declining recently',
      confidence: 0.7,
      dataPoints: motivationReadings.length,
      trend: 'declining',
      actionable: true,
      recommendation: 'May indicate overtraining or life stress - consider lighter week'
    });
  }
}

function analyzePerformanceTrend(
  feedback: DailyFeedback[],
  insights: FeedbackInsight[]
): void {
  const rpeData = feedback.filter(f => f.rpe !== undefined);

  if (rpeData.length < 5) return;

  const avgRPE = rpeData.reduce((sum, f) => sum + f.rpe!, 0) / rpeData.length;
  const recentRPE = rpeData.slice(-3).reduce((sum, f) => sum + f.rpe!, 0) / 3;
  const earlyRPE = rpeData.slice(0, 3).reduce((sum, f) => sum + f.rpe!, 0) / 3;

  if (recentRPE > earlyRPE * 1.3) {
    insights.push({
      type: 'warning',
      category: 'performance',
      message: `Effort level increasing for same workouts (RPE trending up)`,
      confidence: 0.75,
      dataPoints: rpeData.length,
      trend: 'declining',
      actionable: true,
      recommendation: 'May indicate fatigue accumulation - adjust expectations or add recovery'
    });
  } else if (recentRPE < earlyRPE * 0.85) {
    insights.push({
      type: 'positive',
      category: 'performance',
      message: `Workouts feeling easier - fitness improving`,
      confidence: 0.7,
      dataPoints: rpeData.length,
      trend: 'improving',
      actionable: false
    });
  }

  const hrData = feedback.filter(f => f.hrAvg !== undefined && f.morningHR !== undefined);
  if (hrData.length >= 7) {
    const avgMorningHR = hrData.reduce((sum, f) => sum + f.morningHR!, 0) / hrData.length;
    const recentMorningHR = hrData.slice(-3).reduce((sum, f) => sum + f.morningHR!, 0) / 3;

    if (recentMorningHR > avgMorningHR + 5) {
      insights.push({
        type: 'warning',
        category: 'performance',
        message: `Resting heart rate elevated (+${(recentMorningHR - avgMorningHR).toFixed(0)}bpm)`,
        confidence: 0.85,
        dataPoints: hrData.length,
        actionable: true,
        recommendation: 'Possible overreaching or illness - monitor closely'
      });
    }
  }
}

function calculateTrends(feedback: DailyFeedback[]): {
  fatigue: number;
  motivation: number;
  recovery: number;
  performance: number;
} {
  const fatigueData = feedback.filter(f => f.fatigue !== undefined).map(f => f.fatigue!);
  const motivationData = feedback.filter(f => f.motivation !== undefined).map(f => f.motivation!);
  const sleepData = feedback.filter(f => f.sleepQuality !== undefined).map(f => f.sleepQuality!);
  const rpeData = feedback.filter(f => f.rpe !== undefined).map(f => f.rpe!);

  const calculateTrend = (data: number[]): number => {
    if (data.length < 4) return 0;
    const mid = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = data.slice(mid).reduce((a, b) => a + b, 0) / (data.length - mid);
    return ((secondHalf - firstHalf) / firstHalf) * 100;
  };

  return {
    fatigue: calculateTrend(fatigueData),
    motivation: calculateTrend(motivationData),
    recovery: calculateTrend(sleepData),
    performance: -calculateTrend(rpeData)
  };
}

function calculateOverallScore(
  insights: FeedbackInsight[],
  trends: { fatigue: number; motivation: number; recovery: number; performance: number }
): number {
  let score = 80;

  const critical = insights.filter(i => i.type === 'critical').length;
  const warnings = insights.filter(i => i.type === 'warning').length;
  const positive = insights.filter(i => i.type === 'positive').length;

  score -= critical * 25;
  score -= warnings * 10;
  score += positive * 5;

  if (trends.fatigue > 20) score -= 15;
  if (trends.motivation < -20) score -= 10;
  if (trends.recovery < -15) score -= 10;
  if (trends.performance > 15) score += 10;

  return Math.max(0, Math.min(100, score));
}

function determineRiskLevel(insights: FeedbackInsight[]): 'low' | 'medium' | 'high' | 'critical' {
  const critical = insights.filter(i => i.type === 'critical').length;
  const warnings = insights.filter(i => i.type === 'warning').length;

  if (critical > 0) return 'critical';
  if (warnings >= 3) return 'high';
  if (warnings >= 1) return 'medium';
  return 'low';
}

function assessProgressionReadiness(
  insights: FeedbackInsight[],
  trends: { fatigue: number; motivation: number; recovery: number; performance: number },
  overallScore: number
): boolean {
  if (overallScore < 60) return false;

  const critical = insights.filter(i => i.type === 'critical').length;
  const warnings = insights.filter(i => i.type === 'warning' && i.category === 'injury').length;

  if (critical > 0 || warnings > 0) return false;

  if (trends.fatigue > 30) return false;
  if (trends.recovery < -25) return false;

  return true;
}

export function extractKeywords(text: string): string[] {
  const keywords = [
    'pain', 'hurt', 'sore', 'injury', 'tired', 'exhausted', 'sick', 'ill',
    'great', 'strong', 'good', 'excellent', 'breakthrough', 'pr', 'personal record',
    'struggled', 'difficult', 'hard', 'tough', 'easy', 'comfortable',
    'stress', 'work', 'family', 'travel', 'sleep', 'insomnia'
  ];

  const lowerText = text.toLowerCase();
  return keywords.filter(kw => lowerText.includes(kw));
}

export function summarizeWeeklyFeedback(
  weeklyFeedback: WeeklyFeedback[],
  athlete: AthleteProfile
): string {
  if (weeklyFeedback.length === 0) return 'No feedback available';

  const recent = weeklyFeedback[weeklyFeedback.length - 1];

  const parts: string[] = [];

  parts.push(`Week ${recent.weekNumber}:`);

  if (recent.overallFatigue >= FEEDBACK_THRESHOLDS.FATIGUE.HIGH) {
    parts.push('High fatigue reported');
  } else if (recent.overallFatigue <= FEEDBACK_THRESHOLDS.FATIGUE.LOW) {
    parts.push('Feeling fresh and recovered');
  }

  if (recent.motivation >= FEEDBACK_THRESHOLDS.MOTIVATION.GOOD) {
    parts.push('motivation high');
  } else if (recent.motivation <= FEEDBACK_THRESHOLDS.MOTIVATION.LOW) {
    parts.push('motivation low');
  }

  if (recent.missedWorkouts > 2) {
    parts.push(`missed ${recent.missedWorkouts} workouts`);
  }

  if (recent.injuryFlags) {
    parts.push('⚠️ injury concerns noted');
  }

  if (recent.breakthroughWorkouts && recent.breakthroughWorkouts.length > 0) {
    parts.push('💪 breakthrough performance(s)');
  }

  if (recent.perceivedReadiness >= 8) {
    parts.push('ready for progression');
  } else if (recent.perceivedReadiness <= 4) {
    parts.push('needs more recovery');
  }

  return parts.join(', ');
}
