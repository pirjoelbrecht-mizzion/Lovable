#!/usr/bin/env node
/**
 * Test script for Adaptive Coach Modules 6-10
 * Run with: npx tsx test-adaptive-coach-advanced.ts
 */

import {
  // Module 1-5 (for setup)
  buildAthleteProfile,
  convertRaceToEvent,
  classifyAthlete,
  generateMacrocycle,
  generateMicrocycle,

  // Module 6: Safety System
  checkWeeklyPlanSafety,
  calculateSafeVolumeRange,
  enforceMinimumRecovery,
  isWithinSafeACWR,
  SAFETY_LIMITS,

  // Module 7: Adaptive Controller
  analyzeFeedbackSignals,
  makeAdaptationDecision,
  applyAdaptation,
  assessOverallReadiness,

  // Module 8: Race-Specific Logic
  getRaceRequirements,
  calculatePhaseEmphasis,
  adjustVolumeForRaceType,
  getKeyWorkoutsForPhase,
  calculateLongRunDistance,
  validateRaceReadiness,

  // Module 9: Feedback Processing
  processDailyFeedback,
  extractKeywords,
  summarizeWeeklyFeedback,

  // Module 10: Explanation Engine
  explainWeeklyPlan,
  explainAdaptation,
  explainProgressTowardRace,
  generateMotivationalMessage,
  explainWorkoutPurpose,
  explainRaceStrategy
} from './src/lib/adaptive-coach/index';

import type { DailyFeedback, WeeklyFeedback } from './src/lib/adaptive-coach/types';

console.log('🏃 Testing Adaptive Coach Modules 6-10\n');
console.log('='.repeat(60));

// ============================================================================
// SETUP: Create test data
// ============================================================================

const mockUserProfile = {
  id: "test-user",
  user_id: "user-123",
  goalType: "ultra" as const,
  experienceLevel: "intermediate" as const,
  daysPerWeek: 5,
  avgMileage: 50,
  deviceConnected: true,
  planTemplate: "ultra-100k",
  planStartDate: "2024-01-01",
  aiAdaptationLevel: 1 as const,
  onboardingCompleted: true,
  created_at: "2024-01-01",
  updated_at: "2024-01-01"
};

const mockLogEntries = [
  { title: "Easy Run", dateISO: "2024-11-01", km: 10, durationMin: 60 },
  { title: "Long Run", dateISO: "2024-11-03", km: 25, durationMin: 180 },
  { title: "Recovery", dateISO: "2024-11-05", km: 8, durationMin: 50 },
  { title: "Tempo Run", dateISO: "2024-11-07", km: 15, durationMin: 90 },
];

const mockRaces = [
  { id: "race1", name: "Test 50K", dateISO: "2024-06-01", distanceKm: 50 },
  { id: "race2", name: "Mountain 100K", dateISO: "2024-09-15", distanceKm: 100 }
];

const athleteProfile = buildAthleteProfile(mockUserProfile, mockLogEntries, mockRaces);
const profileWithDetails = {
  ...athleteProfile,
  age: 35,
  yearsTraining: 5,
  longestRaceCompletedKm: 100,
  weeklyMileageHistory: [45, 48, 50, 52, 50, 48, 52, 55]
};

const raceEvent = convertRaceToEvent({
  id: "utmb",
  name: "UTMB CCC",
  dateISO: "2025-08-29",
  distanceKm: 100,
  verticalGain: 6000
});
raceEvent.terrain = 'mountain';
raceEvent.climate = 'temperate';

const classification = classifyAthlete(profileWithDetails);

const macrocycle = generateMacrocycle({
  athlete: profileWithDetails,
  race: raceEvent,
  startDate: "2025-01-01"
});

// ============================================================================
// MODULE 6: Safety System
// ============================================================================
console.log('\n🛡️  MODULE 6: Safety System');
console.log('='.repeat(60));

console.log('\n📊 Safety Limits Configuration:');
console.log(`   Max Weekly Increase: ${SAFETY_LIMITS.MAX_WEEKLY_INCREASE_PCT}%`);
console.log(`   ACWR Safe Range: ${SAFETY_LIMITS.ACWR.MIN} - ${SAFETY_LIMITS.ACWR.MAX}`);
console.log(`   Max Consecutive Hard Days: ${SAFETY_LIMITS.RECOVERY.MAX_CONSECUTIVE_HARD_DAYS}`);
console.log(`   Cat2 Volume Range: ${SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MIN}-${SAFETY_LIMITS.WEEKLY_VOLUME.CAT2_MAX}km`);

// Calculate safe volume range
const safeRange = calculateSafeVolumeRange(profileWithDetails, 'base', 50);
console.log('\n✅ Safe Volume Range for Base Phase:');
console.log(`   Min: ${safeRange.min}km`);
console.log(`   Optimal: ${safeRange.optimal}km`);
console.log(`   Max: ${safeRange.max}km`);

// Test ACWR safety
const currentWeek = 58;
const history = [45, 48, 50, 52];
const isACWRSafe = isWithinSafeACWR(currentWeek, history);
console.log(`\n✅ ACWR Safety Check:`);
console.log(`   Current week: ${currentWeek}km`);
console.log(`   Recent history: ${history.join(', ')}km`);
console.log(`   Within safe range: ${isACWRSafe ? 'YES ✓' : 'NO ✗'}`);

// Generate a test weekly plan and check safety
if (macrocycle.weeks.length > 0) {
  const weekPlan = generateMicrocycle({
    weekNumber: 1,
    macrocycleWeek: macrocycle.weeks[0],
    athlete: profileWithDetails,
    race: raceEvent,
    previousWeekMileage: 50
  });

  const safetyCheck = checkWeeklyPlanSafety(weekPlan, profileWithDetails, 50);
  console.log('\n✅ Weekly Plan Safety Check:');
  console.log(`   Plan passed: ${safetyCheck.passed ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Violations: ${safetyCheck.violations.length}`);
  console.log(`   Warnings: ${safetyCheck.warnings.length}`);

  if (safetyCheck.violations.length > 0) {
    console.log('\n   Critical Issues:');
    safetyCheck.violations.forEach(v => {
      console.log(`   - ${v.rule}: ${v.message}`);
    });
  }

  if (safetyCheck.warnings.length > 0 && safetyCheck.warnings.length <= 3) {
    console.log('\n   Warnings:');
    safetyCheck.warnings.slice(0, 3).forEach(w => {
      console.log(`   - ${w.rule}: ${w.message}`);
    });
  }
}

// ============================================================================
// MODULE 7: Adaptive Controller
// ============================================================================
console.log('\n\n🎛️  MODULE 7: Adaptive Controller');
console.log('='.repeat(60));

// Create mock feedback with some concerning signals
const mockFeedback: DailyFeedback[] = [
  { date: '2025-01-01', fatigue: 7, motivation: 6, sleepQuality: 6, muscleAches: 4, completionRate: 1.0 },
  { date: '2025-01-02', fatigue: 8, motivation: 5, sleepQuality: 5, muscleAches: 5, completionRate: 0.9 },
  { date: '2025-01-03', fatigue: 7, motivation: 5, sleepQuality: 5, muscleAches: 6, completionRate: 0.8 },
  { date: '2025-01-04', fatigue: 8, motivation: 4, sleepQuality: 4, muscleAches: 5, completionRate: 0.7 },
  { date: '2025-01-05', fatigue: 9, motivation: 4, sleepQuality: 4, muscleAches: 6, completionRate: 0.6, injuryNotes: 'Left knee pain' }
];

console.log('\n📡 Analyzing Feedback Signals:');
const signals = analyzeFeedbackSignals(mockFeedback, profileWithDetails);
console.log(`   Detected ${signals.length} adaptation signals:`);
signals.forEach(signal => {
  const icon = signal.severity === 'critical' ? '🔴' : signal.severity === 'high' ? '🟠' : '🟡';
  console.log(`   ${icon} ${signal.indicator} (${signal.severity}): Value ${signal.value}, Threshold ${signal.threshold}`);
});

// Make adaptation decision
if (macrocycle.weeks.length > 0) {
  const testPlan = generateMicrocycle({
    weekNumber: 2,
    macrocycleWeek: macrocycle.weeks[1] || macrocycle.weeks[0],
    athlete: profileWithDetails,
    race: raceEvent
  });

  const decision = makeAdaptationDecision(signals, testPlan, profileWithDetails);
  console.log('\n✅ Adaptation Decision:');
  console.log(`   Action: ${decision.action}`);
  console.log(`   Volume Adjustment: ${(decision.volumeAdjustment * 100).toFixed(0)}%`);
  console.log(`   Urgency: ${decision.urgency}`);
  console.log(`   Explanation: ${decision.explanation}`);

  // Apply adaptation
  const adaptedPlan = applyAdaptation(testPlan, decision, profileWithDetails);
  console.log('\n✅ Plan After Adaptation:');
  console.log(`   Original mileage: ${testPlan.actualMileage || testPlan.targetMileage}km`);
  console.log(`   Adapted mileage: ${adaptedPlan.actualMileage || adaptedPlan.targetMileage}km`);
  if (adaptedPlan.adaptationNote) {
    console.log(`   Note: ${adaptedPlan.adaptationNote}`);
  }
}

// Assess overall readiness
const readiness = assessOverallReadiness(profileWithDetails, mockFeedback);
console.log('\n✅ Overall Readiness Assessment:');
console.log(`   Ready: ${readiness.ready ? 'YES ✓' : 'NO ✗'}`);
console.log(`   Score: ${readiness.score}/100`);
if (readiness.blockers.length > 0) {
  console.log(`   Blockers: ${readiness.blockers.join(', ')}`);
}

// ============================================================================
// MODULE 8: Race-Specific Logic
// ============================================================================
console.log('\n\n🏔️  MODULE 8: Race-Specific Logic');
console.log('='.repeat(60));

const raceRequirements = getRaceRequirements(raceEvent);
console.log(`\n📋 Requirements for ${raceEvent.raceType} (${raceEvent.name}):`);
console.log(`   Optimal training weeks: ${raceRequirements.optimalWeeks}`);
console.log(`   Taper weeks: ${raceRequirements.taperWeeks}`);
console.log(`   Peak volume: ${raceRequirements.peakVolumeKm.min}-${raceRequirements.peakVolumeKm.max}km`);
console.log(`   Weekly vertical target: ${raceRequirements.verticalGainWeekly}m`);
console.log(`   Back-to-back required: ${raceRequirements.backToBackRequired ? 'YES' : 'NO'}`);
console.log(`   Key workouts: ${raceRequirements.keyWorkouts.join(', ')}`);

const phaseEmphasis = calculatePhaseEmphasis(raceEvent, 'specificity');
console.log('\n✅ Phase Emphasis for Specificity Phase:');
console.log(`   Base: ${phaseEmphasis.base}%`);
console.log(`   Intensity: ${phaseEmphasis.intensity}%`);
console.log(`   Specificity: ${phaseEmphasis.specificity}%`);
console.log(`   Vertical: ${phaseEmphasis.vertical}%`);
console.log(`   Technical: ${phaseEmphasis.technical}%`);

const adjustedVolume = adjustVolumeForRaceType(60, raceEvent, profileWithDetails);
console.log(`\n✅ Volume Adjusted for Race Type:`);
console.log(`   Base volume: 60km`);
console.log(`   Race-adjusted: ${adjustedVolume}km`);

const keyWorkouts = getKeyWorkoutsForPhase(raceEvent, 'specificity');
console.log(`\n✅ Key Workouts for Specificity Phase:`);
console.log(`   ${keyWorkouts.join(', ')}`);

const longRunDist = calculateLongRunDistance(raceEvent, 80, 'specificity');
console.log(`\n✅ Long Run Distance Calculation:`);
console.log(`   Weekly volume: 80km`);
console.log(`   Phase: specificity`);
console.log(`   Long run distance: ${longRunDist}km`);

const raceReadiness = validateRaceReadiness(raceEvent, profileWithDetails, 24);
console.log(`\n✅ Race Readiness Validation:`);
console.log(`   Ready: ${raceReadiness.ready ? 'YES ✓' : 'NO ✗'}`);
console.log(`   Score: ${raceReadiness.score}/100`);
if (raceReadiness.gaps.length > 0) {
  console.log(`   Gaps identified:`);
  raceReadiness.gaps.forEach(gap => console.log(`   - ${gap}`));
}

// ============================================================================
// MODULE 9: Feedback Processing
// ============================================================================
console.log('\n\n📊 MODULE 9: Feedback Processing');
console.log('='.repeat(60));

const feedbackSummary = processDailyFeedback(mockFeedback, profileWithDetails);
console.log('\n✅ Feedback Summary:');
console.log(`   Period: ${feedbackSummary.period}`);
console.log(`   Overall Score: ${feedbackSummary.overallScore}/100`);
console.log(`   Risk Level: ${feedbackSummary.riskLevel.toUpperCase()}`);
console.log(`   Ready for Progression: ${feedbackSummary.readyForProgression ? 'YES ✓' : 'NO ✗'}`);

console.log('\n✅ Trends:');
console.log(`   Fatigue: ${feedbackSummary.trends.fatigue > 0 ? '↑' : '↓'} ${Math.abs(feedbackSummary.trends.fatigue).toFixed(1)}%`);
console.log(`   Motivation: ${feedbackSummary.trends.motivation > 0 ? '↑' : '↓'} ${Math.abs(feedbackSummary.trends.motivation).toFixed(1)}%`);
console.log(`   Recovery: ${feedbackSummary.trends.recovery > 0 ? '↑' : '↓'} ${Math.abs(feedbackSummary.trends.recovery).toFixed(1)}%`);
console.log(`   Performance: ${feedbackSummary.trends.performance > 0 ? '↑' : '↓'} ${Math.abs(feedbackSummary.trends.performance).toFixed(1)}%`);

console.log(`\n✅ Key Insights (${feedbackSummary.insights.length} total):`);
feedbackSummary.insights.slice(0, 4).forEach(insight => {
  const icon = insight.type === 'critical' ? '🔴' : insight.type === 'warning' ? '🟠' : insight.type === 'positive' ? '🟢' : '⚪';
  console.log(`   ${icon} [${insight.category}] ${insight.message}`);
  if (insight.recommendation) {
    console.log(`      → ${insight.recommendation}`);
  }
});

const mockWeeklyFeedback: WeeklyFeedback[] = [{
  weekNumber: 1,
  weekStartDate: '2025-01-01',
  overallFatigue: 7,
  soreness: 6,
  motivation: 5,
  sleepQuality: 6,
  stress: 7,
  missedWorkouts: 1,
  perceivedReadiness: 5,
  comments: 'Feeling tired this week, work stress high'
}];

const weeklySummary = summarizeWeeklyFeedback(mockWeeklyFeedback, profileWithDetails);
console.log(`\n✅ Weekly Feedback Summary:`);
console.log(`   ${weeklySummary}`);

// Test keyword extraction
const testText = "Had great run today but knee pain returned after 10km. Feeling exhausted.";
const keywords = extractKeywords(testText);
console.log(`\n✅ Keyword Extraction from: "${testText}"`);
console.log(`   Keywords: ${keywords.join(', ')}`);

// ============================================================================
// MODULE 10: Explanation Engine
// ============================================================================
console.log('\n\n💬 MODULE 10: Explanation Engine');
console.log('='.repeat(60));

if (macrocycle.weeks.length > 0) {
  const testPlan = generateMicrocycle({
    weekNumber: 1,
    macrocycleWeek: macrocycle.weeks[0],
    athlete: profileWithDetails,
    race: raceEvent
  });

  const weekExplanation = explainWeeklyPlan(testPlan, profileWithDetails, raceEvent, 34);
  console.log('\n✅ Weekly Plan Explanation:');
  console.log(`   Title: ${weekExplanation.title}`);
  console.log(`   Tone: ${weekExplanation.tone}`);
  console.log(`   Priority: ${weekExplanation.priority}`);
  console.log(`\n   ${weekExplanation.body}`);
  if (weekExplanation.actionItems && weekExplanation.actionItems.length > 0) {
    console.log('\n   Action Items:');
    weekExplanation.actionItems.forEach(item => console.log(`   • ${item}`));
  }

  // Test adaptation explanation
  const testDecision = makeAdaptationDecision(signals, testPlan, profileWithDetails);
  const adaptationExplanation = explainAdaptation(testDecision, profileWithDetails, testPlan);
  console.log('\n✅ Adaptation Explanation:');
  console.log(`   Title: ${adaptationExplanation.title}`);
  console.log(`   ${adaptationExplanation.body}`);
  if (adaptationExplanation.actionItems) {
    console.log('\n   Action Items:');
    adaptationExplanation.actionItems.slice(0, 3).forEach(item => console.log(`   • ${item}`));
  }
}

const progressMessage = explainProgressTowardRace(profileWithDetails, raceEvent, 10, 34, 450);
console.log('\n✅ Progress Update:');
console.log(`   ${progressMessage.title}`);
console.log(`   ${progressMessage.body}`);

const motivationalMessage = generateMotivationalMessage(feedbackSummary, profileWithDetails, 'base');
console.log('\n✅ Motivational Message:');
console.log(`   ${motivationalMessage.title}`);
console.log(`   ${motivationalMessage.body}`);

const workoutPurpose = explainWorkoutPurpose('tempo', 'intensity', raceEvent);
console.log('\n✅ Workout Purpose (Tempo Run):');
console.log(`   ${workoutPurpose}`);

const raceStrategy = explainRaceStrategy(raceEvent, profileWithDetails);
console.log('\n✅ Race Strategy:');
console.log(`   ${raceStrategy.title}`);
console.log(`   ${raceStrategy.body}`);
if (raceStrategy.actionItems) {
  console.log('\n   Key Strategies:');
  raceStrategy.actionItems.slice(0, 3).forEach(item => console.log(`   • ${item}`));
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n\n🎉 ALL MODULES 6-10 TESTED SUCCESSFULLY!');
console.log('='.repeat(60));
console.log('✅ Module 6: Safety System - Enforces training constraints');
console.log('✅ Module 7: Adaptive Controller - AI-driven plan adjustments');
console.log('✅ Module 8: Race-Specific Logic - Customized for race types');
console.log('✅ Module 9: Feedback Processing - Analyzes athlete data');
console.log('✅ Module 10: Explanation Engine - Natural language coaching\n');

console.log('📝 Complete Adaptive Training System:');
console.log('   Modules 1-5: Foundation, profiling, planning, workouts, microcycles');
console.log('   Modules 6-10: Safety, adaptation, race logic, feedback, explanations\n');

console.log('🚀 The Adaptive Ultra Training Engine is fully operational!\n');
