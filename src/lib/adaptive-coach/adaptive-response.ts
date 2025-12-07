import type {
  RaceFeedback,
  DNFEvent,
  ExtendedDailyFeedback,
  RecoveryProtocol,
} from '../../types/feedback';
import type { AthleteProfile } from './types';

export interface MicroAdjustment {
  type: 'micro';
  targetDays: number;
  volumeChange: number;
  intensityChange: number;
  restDaysAdded: number;
  reason: string;
  modifications: Array<{
    date: string;
    change: string;
  }>;
}

export interface MacroAdjustment {
  type: 'macro';
  targetWeeks: number;
  taperModelUpdate?: {
    newDuration: number;
    newIntensityProfile: number[];
  };
  trainingEmphasis?: string[];
  terrainExposure?: {
    verticalGainIncrease: number;
    technicalTerrainSessions: number;
  };
  nutritionProtocol?: string[];
  reason: string;
}

export interface DNFRecoveryPlan {
  type: 'dnf_recovery';
  startDate: string;
  week1: {
    volumePercentage: number;
    intensityGuidelines: string[];
    focusAreas: string[];
  };
  week2: {
    volumePercentage: number;
    intensityGuidelines: string[];
    focusAreas: string[];
  };
  rootCauseProtocol: string[];
  reason: string;
}

export function generateMicroAdjustment(
  feedback: ExtendedDailyFeedback,
  athlete: AthleteProfile
): MicroAdjustment {
  let volumeChange = 0;
  let intensityChange = 0;
  let restDaysAdded = 0;
  const modifications: Array<{ date: string; change: string }> = [];
  let reason = '';

  if ((feedback.fatigue || 0) > 7) {
    volumeChange = -10;
    restDaysAdded = 1;
    reason = 'High fatigue detected - reducing volume and adding rest day';
    modifications.push({
      date: new Date(feedback.date).toISOString().split('T')[0],
      change: 'Volume reduced by 10%, extra rest day added',
    });
  } else if ((feedback.fatigue || 0) < 3 && (feedback.feel || 0) > 8) {
    volumeChange = 5;
    reason = 'Strong recovery - slightly increasing training load';
    modifications.push({
      date: new Date(feedback.date).toISOString().split('T')[0],
      change: 'Volume increased by 5%',
    });
  }

  if (feedback.pain_location && feedback.pain_location !== 'None') {
    intensityChange = -15;
    reason = `${reason}\nPain in ${feedback.pain_location} - reducing intensity`;
    modifications.push({
      date: new Date(feedback.date).toISOString().split('T')[0],
      change: `Intensity reduced by 15% due to pain in ${feedback.pain_location}`,
    });
  }

  if ((feedback.sleep_quality || 0) < 5) {
    volumeChange -= 5;
    reason = `${reason}\nPoor sleep quality - reducing volume`;
    modifications.push({
      date: new Date(feedback.date).toISOString().split('T')[0],
      change: 'Volume reduced by 5% due to poor sleep',
    });
  }

  return {
    type: 'micro',
    targetDays: 7,
    volumeChange,
    intensityChange,
    restDaysAdded,
    reason: reason || 'Minor adjustments based on feedback',
    modifications,
  };
}

export function generateMacroAdjustment(
  raceFeedback: RaceFeedback,
  athlete: AthleteProfile
): MacroAdjustment {
  const trainingEmphasis: string[] = [];
  let terrainExposure:
    | { verticalGainIncrease: number; technicalTerrainSessions: number }
    | undefined;
  const nutritionProtocol: string[] = [];
  let reason = '';

  if (raceFeedback.biggest_limiter === 'heat') {
    trainingEmphasis.push('heat_adaptation');
    trainingEmphasis.push('hydration_protocols');
    reason = 'Heat was primary limiter - increasing heat adaptation training';
  }

  if (raceFeedback.biggest_limiter === 'stomach') {
    nutritionProtocol.push('Test fueling strategy in all long runs');
    nutritionProtocol.push('Increase gut training sessions');
    nutritionProtocol.push('Review fuel types and timing');
    reason = `${reason}\nGI issues detected - comprehensive nutrition protocol update`;
  }

  if ((raceFeedback.climbing_difficulty || 0) >= 4) {
    terrainExposure = {
      verticalGainIncrease: 20,
      technicalTerrainSessions: 2,
    };
    trainingEmphasis.push('vertical_gain');
    reason = `${reason}\nChallenging climbs - increasing vertical training`;
  }

  if ((raceFeedback.downhill_difficulty || 0) >= 4) {
    trainingEmphasis.push('downhill_durability');
    trainingEmphasis.push('eccentric_strength');
    reason = `${reason}\nDifficult downhills - adding eccentric strength work`;
  }

  if (raceFeedback.biggest_limiter === 'pacing') {
    trainingEmphasis.push('pacing_practice');
    trainingEmphasis.push('race_simulations');
    reason = `${reason}\nPacing errors - more controlled pace training needed`;
  }

  return {
    type: 'macro',
    targetWeeks: 8,
    trainingEmphasis: trainingEmphasis.length > 0 ? trainingEmphasis : undefined,
    terrainExposure,
    nutritionProtocol: nutritionProtocol.length > 0 ? nutritionProtocol : undefined,
    reason: reason || 'Macro adjustments based on race performance',
  };
}

export function generateDNFRecoveryPlan(
  dnfEvent: DNFEvent,
  athlete: AthleteProfile
): DNFRecoveryPlan {
  const week1Intensity: string[] = [];
  const week1Focus: string[] = ['Active recovery', 'Easy aerobic base'];

  const week2Intensity: string[] = [
    'Easy runs only',
    'No high-intensity work',
    'Optional short tempo if feeling strong',
  ];
  const week2Focus: string[] = [
    'Gradual volume return',
    'Monitor for warning signs',
  ];

  const rootCauseProtocol: string[] = [];

  if (dnfEvent.dnf_cause === 'injury') {
    week1Intensity.push('Rest or cross-training only if pain-free');
    week1Focus.push('Physical therapy if needed');
    week2Intensity.push('Return to running only if pain-free');
    rootCauseProtocol.push('Comprehensive injury assessment');
    rootCauseProtocol.push('Strengthen identified weak areas');
    rootCauseProtocol.push('Review training load progression');
  } else if (dnfEvent.dnf_cause === 'heat') {
    week1Intensity.push('Avoid heat exposure');
    week1Focus.push('Rehydration protocol');
    week2Intensity.push('Short heat adaptation sessions');
    rootCauseProtocol.push('Systematic heat adaptation protocol');
    rootCauseProtocol.push('Improved hydration strategy');
    rootCauseProtocol.push('Pre-cooling techniques for hot races');
  } else if (dnfEvent.dnf_cause === 'stomach') {
    week1Intensity.push('Gentle exercise only');
    week1Focus.push('GI system rest');
    week2Intensity.push('Test simple nutrition in short runs');
    rootCauseProtocol.push('Complete nutrition strategy review');
    rootCauseProtocol.push('Identify problematic fuel sources');
    rootCauseProtocol.push('Progressive gut training protocol');
  } else if (dnfEvent.dnf_cause === 'pacing') {
    week1Intensity.push('Easy runs with strict HR limits');
    week2Intensity.push('Controlled tempo runs with pacing focus');
    rootCauseProtocol.push('Implement race pacing calculator');
    rootCauseProtocol.push('More conservative race strategy');
    rootCauseProtocol.push('Practice pacing in all key workouts');
  } else if (dnfEvent.dnf_cause === 'mental') {
    week1Focus.push('Mental recovery', 'Low-pressure training');
    rootCauseProtocol.push('Reassess race goals and expectations');
    rootCauseProtocol.push('Mental skills training');
    rootCauseProtocol.push('Consider shorter races to rebuild confidence');
  }

  const startDate = new Date(dnfEvent.event_date);
  startDate.setDate(startDate.getDate() + 2);

  return {
    type: 'dnf_recovery',
    startDate: startDate.toISOString().split('T')[0],
    week1: {
      volumePercentage: 40,
      intensityGuidelines: week1Intensity,
      focusAreas: week1Focus,
    },
    week2: {
      volumePercentage: 60,
      intensityGuidelines: week2Intensity,
      focusAreas: week2Focus,
    },
    rootCauseProtocol,
    reason: `Recovery protocol for DNF caused by ${dnfEvent.dnf_cause} at ${dnfEvent.km_stopped}km`,
  };
}

export function updatePacingModel(
  raceFeedback: RaceFeedback,
  currentPaceFactors: Record<string, number>
): Record<string, number> {
  const updatedFactors = { ...currentPaceFactors };

  if ((raceFeedback.climbing_difficulty || 0) > 3) {
    const climbingAdjustment = ((raceFeedback.climbing_difficulty || 3) - 3) * 0.05;
    updatedFactors.climbing = (updatedFactors.climbing || 1.0) + climbingAdjustment;
  }

  if ((raceFeedback.downhill_difficulty || 0) > 3) {
    const downhillAdjustment = ((raceFeedback.downhill_difficulty || 3) - 3) * 0.03;
    updatedFactors.downhill = (updatedFactors.downhill || 1.0) + downhillAdjustment;
  }

  if ((raceFeedback.heat_perception || 0) > 3) {
    const heatAdjustment = ((raceFeedback.heat_perception || 3) - 3) * 0.04;
    updatedFactors.heat = (updatedFactors.heat || 1.0) + heatAdjustment;
  }

  if ((raceFeedback.technicality || 0) > 3) {
    const technicalAdjustment = ((raceFeedback.technicality || 3) - 3) * 0.06;
    updatedFactors.technical = (updatedFactors.technical || 1.0) + technicalAdjustment;
  }

  return updatedFactors;
}

export function updateNutritionModel(
  raceFeedback: RaceFeedback[],
  dnfEvents: DNFEvent[]
): {
  reliabilityScore: number;
  recommendations: string[];
  successfulStrategies: string[];
  problematicAreas: string[];
} {
  let successCount = 0;
  let failureCount = 0;
  const recommendations: string[] = [];
  const successfulStrategies: string[] = [];
  const problematicAreas: string[] = [];

  for (const race of raceFeedback) {
    if (race.biggest_limiter !== 'stomach') {
      successCount++;
      if (race.fuel_log) {
        successfulStrategies.push(`Successful: ${race.fuel_log.substring(0, 100)}`);
      }
    } else {
      failureCount++;
      problematicAreas.push(
        `GI issues at ${race.issues_start_km || 'unknown'}km: ${race.limiter_notes || 'No details'}`
      );
    }
  }

  for (const dnf of dnfEvents) {
    if (dnf.dnf_cause === 'stomach') {
      failureCount += 2;
      problematicAreas.push(`DNF at ${dnf.km_stopped}km: ${dnf.dnf_cause_notes || 'GI distress'}`);
    }
  }

  const totalEvents = successCount + failureCount;
  const reliabilityScore = totalEvents > 0 ? (successCount / totalEvents) * 100 : 50;

  if (reliabilityScore < 50) {
    recommendations.push('Critical: Comprehensive nutrition strategy overhaul needed');
    recommendations.push('Work with sports nutritionist');
    recommendations.push('Test fueling in all training runs over 90 minutes');
  } else if (reliabilityScore < 75) {
    recommendations.push('Review and refine current nutrition approach');
    recommendations.push('Identify specific problematic foods or timing');
    recommendations.push('Increase gut training frequency');
  }

  if (failureCount > 2) {
    recommendations.push('Consider simpler fuel sources');
    recommendations.push('Practice race-day nutrition in all key workouts');
  }

  return {
    reliabilityScore,
    recommendations,
    successfulStrategies: successfulStrategies.slice(0, 3),
    problematicAreas: problematicAreas.slice(0, 3),
  };
}

export function activateInjuryPrevention(
  painLocations: string[],
  athlete: AthleteProfile
): {
  protocol: string[];
  exercises: string[];
  trainingModifications: string[];
} {
  const protocol: string[] = [
    'Reduce training volume by 15-20%',
    'Add extra rest day per week',
    'Monitor pain levels daily',
  ];

  const exercises: string[] = [];
  const trainingModifications: string[] = [];

  if (painLocations.some(l => l.includes('knee') || l.includes('Knee'))) {
    exercises.push('Single-leg squats', 'Step-ups', 'Hip strengthening');
    trainingModifications.push('Reduce downhill running', 'Increase cross-training');
  }

  if (painLocations.some(l => l.includes('hamstring') || l.includes('Hamstring'))) {
    exercises.push('Nordic curls', 'Hamstring bridges', 'Hip flexor stretches');
    trainingModifications.push('Shorter stride focus', 'Reduce speedwork temporarily');
  }

  if (painLocations.some(l => l.includes('achilles') || l.includes('Ankle'))) {
    exercises.push('Calf raises', 'Eccentric heel drops', 'Ankle mobility');
    trainingModifications.push('Softer surfaces', 'Reduce fast downhills');
  }

  return {
    protocol,
    exercises,
    trainingModifications,
  };
}
