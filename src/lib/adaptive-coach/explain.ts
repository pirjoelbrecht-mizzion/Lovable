/**
 * ======================================================================
 *  ADAPTIVE ULTRA TRAINING ENGINE — EXPLANATION ENGINE
 *  Module 10 — Natural Language Coaching
 * ======================================================================
 *
 * This module generates natural language explanations for:
 * - Why a training plan looks the way it does
 * - Why adjustments were made
 * - What the athlete should focus on
 * - How training prepares them for their goal race
 *
 * Uses template-based generation with dynamic content insertion.
 * Can be enhanced with OpenAI API for more sophisticated explanations.
 */

import type {
  AthleteProfile,
  WeeklyPlan,
  TrainingPhase,
  RaceEvent,
  DailyFeedback
} from './types';
import type { AdaptationDecision } from './adaptive-controller';
import type { FeedbackSummary } from './feedback-processor';

export interface CoachingMessage {
  title: string;
  body: string;
  tone: 'encouraging' | 'cautionary' | 'informative' | 'celebratory';
  priority: 'low' | 'medium' | 'high';
  actionItems?: string[];
}

export function explainWeeklyPlan(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  race: RaceEvent,
  weeksToRace: number
): CoachingMessage {
  const phase = plan.phase;
  const volume = plan.actualMileage || plan.targetMileage;

  let title = '';
  let body = '';
  let tone: 'encouraging' | 'cautionary' | 'informative' | 'celebratory' = 'informative';
  const actionItems: string[] = [];

  switch (phase) {
    case 'base':
      title = `Building Your Aerobic Foundation (Week ${plan.weekNumber})`;
      body = `This week focuses on building your aerobic base with ${volume}km of primarily easy-paced running. `;
      body += `You're ${weeksToRace} weeks out from ${race.name}, which gives us time to build a strong foundation. `;
      body += `Base training develops mitochondrial density and capillary networks - the infrastructure for later intensity work.`;
      actionItems.push('Keep most runs at conversational pace');
      actionItems.push('Focus on consistency over speed');
      actionItems.push('Build aerobic efficiency');
      break;

    case 'intensity':
      title = `Intensity Phase - Building Speed & Power (Week ${plan.weekNumber})`;
      body = `With ${volume}km this week, we're adding structured intensity to your training. `;
      body += `You're ${weeksToRace} weeks from race day, which is the perfect time to sharpen your lactate threshold and VO2max. `;
      body += `These workouts teach your body to run faster while managing fatigue - critical for ${race.raceType} racing.`;
      tone = 'encouraging';
      actionItems.push('Hit your target paces on quality days');
      actionItems.push('Prioritize recovery between hard sessions');
      actionItems.push('Listen to your body during intervals');
      break;

    case 'specificity':
      title = `Race-Specific Training (Week ${plan.weekNumber})`;
      body = `Only ${weeksToRace} weeks until ${race.name}! `;
      body += `This ${volume}km week mimics the demands of your goal race. `;

      if (race.verticalGain > 2000) {
        body += `The vertical gain workouts prepare you for ${race.verticalGain}m of climbing. `;
      }

      if (['100M', '200M'].includes(race.raceType)) {
        body += `Back-to-back long runs simulate the cumulative fatigue you'll face on race day. `;
      }

      body += `Everything now is about rehearsing race conditions.`;
      tone = 'encouraging';
      actionItems.push('Practice race nutrition and hydration');
      actionItems.push('Test all race-day gear');
      actionItems.push('Simulate race terrain when possible');
      break;

    case 'taper':
      title = `Taper Week - Preparing for Peak Performance`;
      body = `Volume drops to ${volume}km this week as we taper for ${race.name}. `;
      body += `Reduced volume allows supercompensation - your body repairs and strengthens. `;
      body += `You might feel restless or sluggish initially - this is normal. `;

      const timeToRaceText = weeksToRace < 1
        ? 'less than a week'
        : `${Math.round(weeksToRace)} week${Math.round(weeksToRace) === 1 ? '' : 's'}`;
      body += `Trust the taper process. With just ${timeToRaceText} to go, your fitness is locked in.`;

      tone = 'cautionary';
      actionItems.push('Maintain some intensity but reduce volume');
      actionItems.push('Prioritize sleep and nutrition');
      actionItems.push('Stay loose - light stretching and mobility work');
      actionItems.push('Avoid trying anything new');
      break;

    case 'goal':
      title = `Race Week - ${race.name}`;
      body = `This is it! All the training comes together this week. `;
      body += `Minimal running (${volume}km) keeps you sharp without adding fatigue. `;
      body += `Focus on logistics, mental preparation, and staying healthy. `;
      body += `You've done the work - now trust your training.`;
      tone = 'celebratory';
      actionItems.push('Review race plan and pacing strategy');
      actionItems.push('Organize gear and drop bags');
      actionItems.push('Stay hydrated and well-fed');
      actionItems.push('Get plenty of sleep (especially 2 nights before)');
      break;

    case 'transition':
      title = `Active Recovery & Transition`;
      body = `Taking it easy with ${volume}km of relaxed running. `;
      body += `Transition phases allow full recovery while maintaining fitness. `;
      body += `Think of this as pressing the reset button before building toward ${race.name}.`;
      actionItems.push('Keep runs easy and enjoyable');
      actionItems.push('Cross-training welcome');
      actionItems.push('Address any lingering niggles');
      break;
  }

  if (athlete.category === 'Cat1' && volume > 80) {
    body += `\n\nNote: This is a high-volume week for your current fitness level. Listen to your body and don't hesitate to cut runs short if needed.`;
    tone = 'cautionary';
  }

  return {
    title,
    body,
    tone,
    priority: phase === 'taper' || phase === 'goal' ? 'high' : 'medium',
    actionItems
  };
}

export function explainAdaptation(
  decision: AdaptationDecision,
  athlete: AthleteProfile,
  originalPlan: WeeklyPlan
): CoachingMessage {
  let title = '';
  let body = '';
  let tone: 'encouraging' | 'cautionary' | 'informative' | 'celebratory' = 'cautionary';
  const actionItems: string[] = [];

  switch (decision.action) {
    case 'maintain':
      title = 'Plan Stays on Track';
      body = 'Your feedback looks good - no adjustments needed this week. ';
      body += 'Keep up the consistent effort and continue monitoring how you feel.';
      tone = 'encouraging';
      break;

    case 'reduce_volume_minor':
      title = 'Minor Volume Adjustment';
      body = `Based on your feedback, I'm reducing this week's volume by ${Math.abs(decision.volumeAdjustment * 100).toFixed(0)}%. `;
      body += `You've shown some early fatigue signals, and it's better to be proactive. `;
      body += `This adjustment prevents issues while keeping you moving forward.`;
      actionItems.push('Focus on recovery quality');
      actionItems.push('Monitor energy levels');
      actionItems.push('Resume normal volume next week if feeling better');
      break;

    case 'reduce_volume_major':
      title = 'Significant Volume Reduction Required';
      body = `Your recent feedback indicates accumulated fatigue or stress. `;
      body += `Volume drops ${Math.abs(decision.volumeAdjustment * 100).toFixed(0)}% this week to allow proper recovery. `;
      body += `This isn't a setback - it's smart training. Better to take a lighter week now than risk injury later.`;
      actionItems.push('Prioritize sleep and nutrition');
      actionItems.push('Address any pain or discomfort');
      actionItems.push('Resume building when energy returns');
      break;

    case 'reduce_intensity':
      title = 'Intensity Adjustment';
      body = 'Converting high-intensity workouts to moderate effort this week. ';
      body += 'Volume stays similar, but we\'re easing off the gas pedal to allow recovery. ';
      body += 'This maintains consistency while respecting your current state.';
      actionItems.push('Keep workouts conversational');
      actionItems.push('Focus on form and rhythm');
      actionItems.push('Save hard efforts for next cycle');
      break;

    case 'add_rest_day':
      title = 'Extra Rest Day Added';
      body = 'Your body is asking for more recovery - so I\'ve added an extra rest day. ';
      body += 'Rest days are when adaptations happen. More isn\'t always better. ';
      body += 'Use this day for active recovery, stretching, or complete rest.';
      tone = 'informative';
      actionItems.push('Complete rest or very light cross-training');
      actionItems.push('Focus on mobility and flexibility');
      actionItems.push('Catch up on sleep if possible');
      break;

    case 'deload_week':
      title = 'Deload Week Activated';
      body = 'Multiple fatigue signals triggered a deload week. ';
      body += 'Volume drops 30% and intensity moderates significantly. ';
      body += 'This strategic rest week will leave you stronger and more resilient. ';
      body += 'Elite athletes deload regularly - it\'s part of intelligent training.';
      tone = 'cautionary';
      actionItems.push('Embrace the lighter workload');
      actionItems.push('Focus on sleep, nutrition, hydration');
      actionItems.push('Do some fun, easy runs');
      actionItems.push('Expect to feel refreshed in 7-10 days');
      break;

    case 'medical_attention':
      title = '⚠️ Medical Consultation Recommended';
      body = 'Your feedback indicates pain or injury concerns that need professional evaluation. ';
      body += 'I\'ve created a minimal recovery week, but please see a healthcare provider. ';
      body += 'Early intervention prevents small issues from becoming major problems.';
      tone = 'cautionary';
      actionItems.push('Schedule appointment with sports medicine doctor or PT');
      actionItems.push('Document specific symptoms and when they occur');
      actionItems.push('Consider cross-training (swimming, cycling) if approved');
      actionItems.push('Do not resume running until cleared');
      break;

    default:
      title = 'Plan Adjustment';
      body = decision.explanation;
      actionItems.push('Follow adjusted plan');
      actionItems.push('Monitor symptoms');
  }

  if (decision.signals.length > 0) {
    body += `\n\nTriggering factors: ${decision.signals.map(s => s.indicator.toLowerCase().replace(/_/g, ' ')).join(', ')}.`;
  }

  return {
    title,
    body,
    tone,
    priority: decision.urgency === 'high' ? 'high' : 'medium',
    actionItems: actionItems.length > 0 ? actionItems : undefined
  };
}

export function explainProgressTowardRace(
  athlete: AthleteProfile,
  race: RaceEvent,
  currentWeek: number,
  totalWeeks: number,
  completedMileage: number
): CoachingMessage {
  const weeksRemaining = totalWeeks - currentWeek;
  const progressPercent = (currentWeek / totalWeeks) * 100;

  let title = `Progress Update: ${progressPercent.toFixed(0)}% Complete`;
  let body = '';

  if (progressPercent < 30) {
    body = `You're in the early base-building phase with ${weeksRemaining} weeks until ${race.name}. `;
    body += `This foundation work might feel mundane, but it's essential. `;
    body += `You've logged ${completedMileage}km so far - every mile is an investment in race day success.`;
  } else if (progressPercent < 60) {
    body = `You're ${weeksRemaining} weeks from ${race.name} and progressing well. `;
    body += `The base phase is behind you, and you're building fitness steadily. `;
    body += `${completedMileage}km completed puts you right on track. Keep the momentum going!`;
  } else if (progressPercent < 85) {
    body = `You're in the home stretch - only ${weeksRemaining} weeks to ${race.name}! `;
    body += `${completedMileage}km in the bank shows serious commitment. `;
    body += `Now it's about sharpening race-specific fitness and staying healthy.`;
  } else {
    const timeRemaining = weeksRemaining < 1
      ? 'less than a week'
      : `${Math.round(weeksRemaining)} week${Math.round(weeksRemaining) === 1 ? '' : 's'}`;
    body = `Race week approaches! Just ${timeRemaining} until ${race.name}. `;
    body += `You've completed ${completedMileage}km of training. The hard work is done. `;
    body += `Trust your preparation and focus on arriving at the start line healthy and confident.`;
  }

  return {
    title,
    body,
    tone: progressPercent > 70 ? 'encouraging' : 'informative',
    priority: progressPercent > 85 ? 'high' : 'medium'
  };
}

export function generateMotivationalMessage(
  feedbackSummary: FeedbackSummary,
  athlete: AthleteProfile,
  phase: TrainingPhase
): CoachingMessage {
  let title = '';
  let body = '';
  let tone: 'encouraging' | 'cautionary' | 'informative' | 'celebratory' = 'encouraging';

  if (feedbackSummary.riskLevel === 'low' && feedbackSummary.readyForProgression) {
    title = '💪 Strong Week!';
    body = 'Your feedback shows you\'re adapting well to the training load. ';
    body += 'Consistency like this builds championship fitness. ';
    body += 'Keep channeling this energy into your workouts!';
    tone = 'celebratory';
  } else if (feedbackSummary.riskLevel === 'medium') {
    title = 'Steady as She Goes';
    body = 'You\'re managing the training well overall, with a few signs we\'re monitoring. ';
    body += 'Stay attuned to your body and don\'t ignore minor warning signs. ';
    body += 'Small adjustments now prevent big problems later.';
    tone = 'informative';
  } else if (feedbackSummary.riskLevel === 'high') {
    title = 'Recovery Focus Needed';
    body = 'Your body is showing clear fatigue signals. ';
    body += 'Remember: training stress + recovery = adaptation. Without proper recovery, it\'s just stress. ';
    body += 'Let\'s make smart adjustments to keep you progressing safely.';
    tone = 'cautionary';
  } else {
    title = '⚠️ Time to Pull Back';
    body = 'Your feedback indicates you need significant recovery. ';
    body += 'The bravest thing an athlete can do is rest when needed. ';
    body += 'Let\'s take care of you now so you can finish strong later.';
    tone = 'cautionary';
  }

  if (feedbackSummary.insights.filter(i => i.type === 'positive').length >= 2) {
    body += '\n\nBright spots: ' + feedbackSummary.insights
      .filter(i => i.type === 'positive')
      .map(i => i.message.toLowerCase())
      .join(', ') + '. Keep building on these wins!';
    tone = 'encouraging';
  }

  return {
    title,
    body,
    tone,
    priority: feedbackSummary.riskLevel === 'critical' ? 'high' : 'medium'
  };
}

export function explainWorkoutPurpose(
  workoutType: string,
  phase: TrainingPhase,
  race: RaceEvent
): string {
  const purposes: Record<string, string> = {
    easy: `Easy runs build aerobic capacity and promote recovery while maintaining consistency. They should feel conversational and relaxed.`,

    long: `Long runs develop endurance, fat-burning efficiency, and mental toughness. For ultras, they teach your body to function under prolonged stress.`,

    tempo: `Tempo runs improve your lactate threshold - the pace you can sustain for extended periods. Critical for maintaining race pace without blowing up.`,

    threshold: `Threshold work trains your body to clear lactate efficiently, allowing you to run faster for longer. Think "comfortably hard" effort.`,

    intervals: `Intervals boost VO2max and running economy. Short, hard efforts with recovery teach your body to process oxygen more efficiently.`,

    hill_repeats: `Hill repeats build power, strength, and running-specific muscles. They're especially important for races with significant vertical gain.`,

    vertical: `Vertical-specific training prepares you for sustained climbing. Develops the muscular endurance and mental fortitude for big mountain days.`,

    back_to_back: `Back-to-back long runs simulate cumulative fatigue of ultra racing. They teach your body to perform on tired legs - exactly what race day demands.`,

    recovery: `Recovery runs accelerate healing by increasing blood flow without adding significant stress. Keep these truly easy!`,

    race_pace: `Race pace workouts dial in your goal pace and build confidence. They're dress rehearsals for the main event.`,

    technical_trail: `Technical trail work develops proprioception, ankle stability, and the specific coordination needed for challenging terrain.`,

    fartlek: `Fartlek (speed play) builds speed and fitness in an unstructured, fun way. Great for breaking training monotony while still working hard.`
  };

  return purposes[workoutType] || 'This workout develops your fitness and prepares you for race-day demands.';
}

export function generateWeeklySummary(
  plan: WeeklyPlan,
  athlete: AthleteProfile,
  race: RaceEvent
): string {
  const daysWithWorkouts = plan.days.filter(d => d.workout && d.workout.type !== 'rest').length;
  const hardDays = plan.days.filter(d =>
    d.workout && (d.workout.intensity === 'high' || d.workout.type === 'long')
  ).length;

  let summary = `Week ${plan.weekNumber} (${plan.phase} phase): ${plan.targetMileage}km across ${daysWithWorkouts} training days. `;

  if (hardDays > 0) {
    summary += `${hardDays} key workout${hardDays > 1 ? 's' : ''} focus on `;

    const keyWorkouts = plan.days
      .filter(d => d.workout && (d.workout.intensity === 'high' || d.workout.type === 'long'))
      .map(d => d.workout!.type)
      .slice(0, 2);

    summary += keyWorkouts.join(' and ') + '. ';
  }

  if (plan.targetVert > 1000) {
    summary += `Target ${plan.targetVert}m vertical gain to prepare for ${race.name}'s climbing. `;
  }

  const restDays = 7 - daysWithWorkouts;
  summary += `${restDays} rest day${restDays !== 1 ? 's' : ''} for recovery.`;

  return summary;
}

export function explainRaceStrategy(
  race: RaceEvent,
  athlete: AthleteProfile
): CoachingMessage {
  const title = `Race Strategy for ${race.name}`;
  let body = '';
  const actionItems: string[] = [];

  body += `${race.name} is a ${race.distanceKm}km ${race.raceType} with ${race.verticalGain}m of climbing. `;

  if (['100M', '200M'].includes(race.raceType)) {
    body += `Ultra distances require patient pacing and excellent energy management. `;
    body += `Start conservatively - you'll pass people all day if you pace wisely. `;
    actionItems.push('Run first 50% at 80-85% effort');
    actionItems.push('Eat and drink before you\'re hungry or thirsty');
    actionItems.push('Walk steep climbs to save running legs');
  } else if (['50K', '50M'].includes(race.raceType)) {
    body += `This distance is long enough to require smart pacing but short enough that you can push harder than longer ultras. `;
    actionItems.push('Start at goal pace, not faster');
    actionItems.push('Fuel every 30-45 minutes');
    actionItems.push('Save something for last 25%');
  }

  if (race.verticalGain > 2000) {
    body += `\n\nWith significant elevation, power-hiking climbs is race-winning strategy. `;
    body += `Most runners burn matches trying to run uphills - be the smart one who hikes strong and passes them later.`;
    actionItems.push('Power-hike steep grades (>10%)');
    actionItems.push('Make time on downhills and flats');
  }

  if (race.terrain === 'mountain' || race.technicalDifficulty === 'hard') {
    body += `\n\nTechnical terrain demands constant focus. Losing concentration late in the race causes falls.`;
    actionItems.push('Stay present and focused on foot placement');
    actionItems.push('Reduce speed on technical descents when tired');
  }

  return {
    title,
    body,
    tone: 'informative',
    priority: 'high',
    actionItems
  };
}
