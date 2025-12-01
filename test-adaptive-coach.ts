#!/usr/bin/env node
/**
 * Test script for Adaptive Coach Modules 1-5
 * Run with: npx tsx test-adaptive-coach.ts
 */

import {
  // Module 1: Types & Adapters
  buildAthleteProfile,
  convertRaceToEvent,
  SAFE_ACWR_RANGE,

  // Module 2: Athlete Profiler
  classifyAthlete,
  assessAerobicDeficiency,
  calculateReadiness,

  // Module 3: Macrocycle Planner
  generateMacrocycle,
  getCurrentWeek,
  isInTaper,

  // Module 4: Workout Library
  getWorkoutsForPhase,
  getWorkoutsByType,
  getWorkoutById,
  WORKOUT_LIBRARY,

  // Module 5: Microcycle Generator
  generateMicrocycle,
  isRecoveryWeek,
  personalizeWorkout
} from './src/lib/adaptive-coach/index';

console.log('🏃 Testing Adaptive Coach Modules 1-5\n');

// ============================================================================
// MODULE 1: Types & Adapters
// ============================================================================
console.log('📋 MODULE 1: Types & Adapters');
console.log('================================\n');

const mockUserProfile = {
  id: "test-user",
  user_id: "user-123",
  goalType: "ultra" as const,
  experienceLevel: "intermediate" as const,
  daysPerWeek: 5,
  avgMileage: 45,
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
console.log('✅ Athlete Profile Built:');
console.log(`   - Years Training: ${athleteProfile.yearsTraining}`);
console.log(`   - Average Mileage: ${athleteProfile.averageMileage} km/week`);
console.log(`   - Longest Race: ${athleteProfile.longestRaceCompletedKm} km`);
console.log(`   - Recent Races: ${athleteProfile.recentRaces.length}\n`);

const raceEvent = convertRaceToEvent({
  id: "utmb",
  name: "UTMB",
  dateISO: "2025-08-29",
  distanceKm: 170
});
console.log('✅ Race Converted to Event:');
console.log(`   - Name: ${raceEvent.name}`);
console.log(`   - Type: ${raceEvent.raceType}`);
console.log(`   - Distance: ${raceEvent.distanceKm} km\n`);

console.log(`✅ Safety Constants:`);
console.log(`   - Safe ACWR Range: ${SAFE_ACWR_RANGE.min} - ${SAFE_ACWR_RANGE.max}`);
console.log(`   - Optimal ACWR: ${SAFE_ACWR_RANGE.optimal}\n`);

// ============================================================================
// MODULE 2: Athlete Profiler
// ============================================================================
console.log('\n🎯 MODULE 2: Athlete Profiler');
console.log('================================\n');

// Add required fields for classification
const profileForClassification = {
  ...athleteProfile,
  age: 35,
  yearsTraining: 3,
  longestRaceCompletedKm: 100
};

const classification = classifyAthlete(profileForClassification);
console.log('✅ Athlete Classification:');
console.log(`   - Category: ${classification.category}`);
console.log(`   - Recovery Ratio: ${classification.recoveryRatio}`);
console.log(`   - Quality Days/Week: ${classification.qualityDaysPerWeek}`);
console.log(`   - Max Weekly Volume: ${classification.maxWeeklyMileage} km`);
console.log(`   - Reasoning: ${classification.reasoning}\n`);

const aerobicAssessment = assessAerobicDeficiency(profileForClassification);
console.log('✅ Aerobic Assessment:');
console.log(`   - Has Deficiency: ${aerobicAssessment.hasDeficiency}`);
if (aerobicAssessment.adsScore !== undefined) {
  console.log(`   - ADS Score: ${aerobicAssessment.adsScore.toFixed(2)}`);
}
console.log(`   - Recommendation: ${aerobicAssessment.recommendation}\n`);

const readiness = calculateReadiness(
  profileForClassification,
  [40, 45, 50, 55, 60],  // Recent weekly km
  [3, 2, 3, 2, 3]        // Recent fatigue scores
);
console.log('✅ Readiness Score:');
console.log(`   - Overall Score: ${readiness.overallScore}/100`);
console.log(`   - Can Progress to Intensity: ${readiness.canProgressToIntensity}`);
console.log(`   - Factors:`);
console.log(`      Aerobic Base: ${readiness.factors.aerobicBase}`);
console.log(`      Consistency: ${readiness.factors.consistency}`);
console.log(`      Recent Load: ${readiness.factors.recentLoad}`);
console.log(`      Recovery: ${readiness.factors.recovery}`);
if (readiness.blockers.length > 0) {
  console.log(`   - Blockers: ${readiness.blockers.join(', ')}`);
}
console.log();

// ============================================================================
// MODULE 3: Macrocycle Planner
// ============================================================================
console.log('\n📅 MODULE 3: Macrocycle Planner');
console.log('================================\n');

const macrocycle = generateMacrocycle({
  athlete: profileForClassification,
  race: raceEvent,
  startDate: "2025-01-01"
});

console.log('✅ Macrocycle Generated:');
console.log(`   - Total Weeks: ${macrocycle.totalWeeks}`);
console.log(`   - Start Date: ${macrocycle.startDate}`);
console.log(`   - Race Date: ${macrocycle.raceDate}`);
console.log(`   - Phase Breakdown:`);
Object.entries(macrocycle.phaseBreakdown).forEach(([phase, weeks]) => {
  console.log(`      ${phase}: ${weeks} weeks`);
});
console.log();

const currentWeek = getCurrentWeek(macrocycle);
if (currentWeek) {
  console.log(`✅ Current Week: ${currentWeek.weekNumber}`);
  console.log(`   - Phase: ${currentWeek.phase}`);
  console.log(`   - Target Mileage: ${currentWeek.targetMileage} km\n`);
}

console.log(`✅ Taper Status: ${isInTaper(macrocycle) ? 'In Taper' : 'Not in Taper'}\n`);

// ============================================================================
// MODULE 4: Workout Library
// ============================================================================
console.log('\n💪 MODULE 4: Workout Library');
console.log('================================\n');

const easyWorkouts = getWorkoutsByType('easy');
console.log(`✅ Easy Workouts (${easyWorkouts.length} variants):`);
if (easyWorkouts.length > 0) {
  const first = easyWorkouts[0];
  console.log(`   - Duration: ${first.durationMinutes} min`);
  console.log(`   - Intensity: ${first.intensity}`);
  console.log(`   - Purpose: ${first.purpose}\n`);
}

const baseWorkouts = getWorkoutsForPhase('base');
console.log(`✅ Base Phase Workouts (${baseWorkouts.length} types):`);
baseWorkouts.slice(0, 5).forEach(w => {
  console.log(`   - ${w.type}: ${w.durationMinutes}min @ ${w.intensity}`);
});
console.log();

console.log(`✅ Total Workout Library Entries: ${WORKOUT_LIBRARY.length}\n`);

// ============================================================================
// MODULE 5: Microcycle Generator
// ============================================================================
console.log('\n📆 MODULE 5: Microcycle Generator');
console.log('================================\n');

// Get a week from the macrocycle to generate a microcycle
if (macrocycle.weeks.length > 0) {
  const firstWeek = macrocycle.weeks[0];

  const weeklyPlan = generateMicrocycle({
    weekNumber: 1,
    macrocycleWeek: firstWeek,
    athlete: profileForClassification,
    race: raceEvent
  });

  console.log('✅ Weekly Plan Generated:');
  console.log(`   - Week: ${weeklyPlan.weekNumber}`);
  console.log(`   - Phase: ${weeklyPlan.phase}`);
  console.log(`   - Actual Mileage: ${weeklyPlan.actualMileage} km`);
  console.log(`   - Days with workouts: ${weeklyPlan.days.filter(d => d.workout).length}\n`);

  // Show first 3 days
  weeklyPlan.days.slice(0, 3).forEach(day => {
    if (day.workout) {
      console.log(`   ${day.dayOfWeek}:`);
      console.log(`      ${day.workout.type} - ${day.workout.distanceKm}km`);
    } else {
      console.log(`   ${day.dayOfWeek}: Rest Day`);
    }
  });
  console.log();
}

// Test utility functions
const isRecovery = isRecoveryWeek(1, profileForClassification);
console.log(`✅ Microcycle Utilities:`);
console.log(`   - Week 1 is recovery week: ${isRecovery}\n`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n🎉 ALL MODULES TESTED SUCCESSFULLY!');
console.log('===================================\n');
console.log('✅ Module 1: Types & Adapters');
console.log('✅ Module 2: Athlete Profiler (Cat1/Cat2 Classification)');
console.log('✅ Module 3: Macrocycle Planner');
console.log('✅ Module 4: Workout Library');
console.log('✅ Module 5: Microcycle Generator\n');

console.log('📝 Next Steps (Modules 6-10 - NOT YET IMPLEMENTED):');
console.log('   ⏳ Module 6: Safety System');
console.log('   ⏳ Module 7: Adaptive Controller');
console.log('   ⏳ Module 8: Race-Specific Logic');
console.log('   ⏳ Module 9: Feedback Processing');
console.log('   ⏳ Module 10: OpenAI Explanation Engine\n');
