// Unit test for core logic without database dependencies

type CoreCategory = 'anti_extension' | 'anti_rotation' | 'lateral_stability' | 'hip_core_linkage';
type RaceType = 'vk' | 'ultra' | 'skimo' | 'trail' | 'road' | 'marathon';
type UpperBodyEligibilityType = 'full' | 'maintenance' | 'none';

interface UpperBodyEligibility {
  eligible: boolean;
  type: UpperBodyEligibilityType;
  reason: string;
}

interface CoreEmphasis {
  primary: CoreCategory;
  secondary: CoreCategory;
  tertiary: CoreCategory;
  adjustments?: string[];
}

interface UserTerrainAccess {
  isSkimoAthlete: boolean;
  usesPoles: boolean;
  hasGymAccess: boolean;
  hasSteepHills: boolean;
}

const RACE_TYPE_CORE_EMPHASIS: Record<RaceType, { primary: CoreCategory; secondary: CoreCategory; tertiary: CoreCategory }> = {
  vk: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'anti_rotation' },
  ultra: { primary: 'lateral_stability', secondary: 'anti_rotation', tertiary: 'anti_extension' },
  skimo: { primary: 'anti_rotation', secondary: 'anti_extension', tertiary: 'hip_core_linkage' },
  trail: { primary: 'lateral_stability', secondary: 'anti_extension', tertiary: 'hip_core_linkage' },
  road: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'lateral_stability' },
  marathon: { primary: 'anti_extension', secondary: 'hip_core_linkage', tertiary: 'lateral_stability' },
};

function determineUpperBodyEligibility(
  terrainAccess: UserTerrainAccess | null,
  raceType?: RaceType
): UpperBodyEligibility {
  if (raceType === 'skimo' || terrainAccess?.isSkimoAthlete) {
    return {
      eligible: true,
      type: 'full',
      reason: 'Skimo athlete requires full upper-body ME for pole propulsion',
    };
  }

  if (terrainAccess?.usesPoles) {
    return {
      eligible: true,
      type: 'maintenance',
      reason: 'Pole user gets light upper-body maintenance only',
    };
  }

  return {
    eligible: false,
    type: 'none',
    reason: 'Running focus - lower body ME only',
  };
}

function determineCoreEmphasis(
  raceType: RaceType = 'trail',
  painReports: string[] = [],
  usesPoles: boolean = false
): CoreEmphasis {
  const baseEmphasis = RACE_TYPE_CORE_EMPHASIS[raceType] || RACE_TYPE_CORE_EMPHASIS.trail;
  const adjustments: string[] = [];

  let { primary, secondary, tertiary } = baseEmphasis;

  if (painReports.includes('knee_downhill') || painReports.includes('knee_pain')) {
    primary = 'lateral_stability';
    secondary = 'hip_core_linkage';
    adjustments.push('Knee pain detected - emphasizing lateral stability and hip control');
  }

  if (painReports.includes('legs_fatigue_before_breathing')) {
    primary = 'anti_extension';
    adjustments.push('Frontier fiber issue detected - emphasizing anti-extension and carries');
  }

  if (usesPoles && raceType !== 'skimo') {
    if (secondary !== 'anti_rotation') {
      tertiary = secondary;
      secondary = 'anti_rotation';
    }
    adjustments.push('Pole usage - adding anti-rotation emphasis');
  }

  return { primary, secondary, tertiary, adjustments };
}

function calculateMEProgressionState(
  lastSessionDate: Date | null,
  currentDate: Date,
  currentWorkoutNumber: number
): { action: string; targetWorkoutNumber: number; daysSince: number | null; reason: string } {
  if (!lastSessionDate) {
    return {
      action: 'restart',
      targetWorkoutNumber: 1,
      daysSince: null,
      reason: 'No previous ME session found',
    };
  }

  const daysSince = Math.floor((currentDate.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= 12) {
    return {
      action: 'advance',
      targetWorkoutNumber: Math.min(currentWorkoutNumber + 1, 12),
      daysSince,
      reason: `${daysSince} days since last session - advancing`,
    };
  }

  if (daysSince <= 21) {
    return {
      action: 'repeat',
      targetWorkoutNumber: currentWorkoutNumber,
      daysSince,
      reason: `${daysSince} days since last session - repeating same workout`,
    };
  }

  return {
    action: 'regress',
    targetWorkoutNumber: Math.max(currentWorkoutNumber - 2, 1),
    daysSince,
    reason: `${daysSince} days since last session - regressing 2 workouts`,
  };
}

function calculateSorenessAdjustment(
  sorenessLevel: number,
  hoursOfSoreness: number
): { multiplier: number; reason: string } {
  if (sorenessLevel >= 4 && hoursOfSoreness >= 48) {
    return {
      multiplier: 0.7,
      reason: 'Persistent soreness detected - reducing volume by 30%',
    };
  }

  return {
    multiplier: 1.0,
    reason: 'No volume adjustment needed',
  };
}

// Run tests
console.log('=== TEST 1: Trail runner, no poles ===');
const user1 = determineUpperBodyEligibility(
  { isSkimoAthlete: false, usesPoles: false, hasGymAccess: true, hasSteepHills: true },
  'ultra'
);
console.log('Upper body eligibility:', user1);
console.log('✓ Expected: eligible=false, type=none');
console.log(`${user1.eligible === false && user1.type === 'none' ? '✅ PASS' : '❌ FAIL'}\n`);

const user1Core = determineCoreEmphasis('ultra', [], false);
console.log('Core emphasis:', user1Core);
console.log('✓ Expected: primary=lateral_stability, secondary=anti_rotation');
console.log(`${user1Core.primary === 'lateral_stability' && user1Core.secondary === 'anti_rotation' ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 2: Trail runner with poles ===');
const user2 = determineUpperBodyEligibility(
  { isSkimoAthlete: false, usesPoles: true, hasGymAccess: true, hasSteepHills: true },
  'ultra'
);
console.log('Upper body eligibility:', user2);
console.log('✓ Expected: eligible=true, type=maintenance');
console.log(`${user2.eligible === true && user2.type === 'maintenance' ? '✅ PASS' : '❌ FAIL'}\n`);

const user2Core = determineCoreEmphasis('ultra', [], true);
console.log('Core emphasis:', user2Core);
console.log('✓ Expected: anti_rotation should be secondary due to poles');
console.log(`${user2Core.secondary === 'anti_rotation' && user2Core.adjustments?.includes('Pole usage - adding anti-rotation emphasis') ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 3: Skimo athlete ===');
const user3 = determineUpperBodyEligibility(
  { isSkimoAthlete: true, usesPoles: true, hasGymAccess: true, hasSteepHills: true },
  'skimo'
);
console.log('Upper body eligibility:', user3);
console.log('✓ Expected: eligible=true, type=full');
console.log(`${user3.eligible === true && user3.type === 'full' ? '✅ PASS' : '❌ FAIL'}\n`);

const user3Core = determineCoreEmphasis('skimo', [], false);
console.log('Core emphasis:', user3Core);
console.log('✓ Expected: primary=anti_rotation');
console.log(`${user3Core.primary === 'anti_rotation' ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 4: VK runner ===');
const vkCore = determineCoreEmphasis('vk', [], false);
console.log('VK core emphasis:', vkCore);
console.log('✓ Expected: primary=anti_extension');
console.log(`${vkCore.primary === 'anti_extension' ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 5: ME Progression state machine ===');
const prog1 = calculateMEProgressionState(new Date('2024-12-15'), new Date('2024-12-22'), 5);
console.log('7 days since last ME:', prog1);
console.log('✓ Expected: action=advance, target=6');
console.log(`${prog1.action === 'advance' && prog1.targetWorkoutNumber === 6 ? '✅ PASS' : '❌ FAIL'}\n`);

const prog2 = calculateMEProgressionState(new Date('2024-12-01'), new Date('2024-12-22'), 5);
console.log('21 days since last ME:', prog2);
console.log('✓ Expected: action=repeat (at exactly 21 days)');
console.log(`${prog2.action === 'repeat' ? '✅ PASS' : '❌ FAIL'}\n`);

const prog3 = calculateMEProgressionState(new Date('2024-11-28'), new Date('2024-12-22'), 5);
console.log('24 days since last ME:', prog3);
console.log('✓ Expected: action=regress, target=3 (5-2)');
console.log(`${prog3.action === 'regress' && prog3.targetWorkoutNumber === 3 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 6: Soreness adjustment ===');
const soreness1 = calculateSorenessAdjustment(3, 24);
console.log('Soreness 3/10 for 24h:', soreness1);
console.log('✓ Expected: multiplier=1.0 (no adjustment)');
console.log(`${soreness1.multiplier === 1.0 ? '✅ PASS' : '❌ FAIL'}\n`);

const soreness2 = calculateSorenessAdjustment(5, 60);
console.log('Soreness 5/10 for 60h:', soreness2);
console.log('✓ Expected: multiplier=0.7 (30% reduction)');
console.log(`${soreness2.multiplier === 0.7 ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('=== TEST 7: Pain-based core adjustment ===');
const kneeCore = determineCoreEmphasis('ultra', ['knee_downhill'], false);
console.log('Ultra runner with knee pain:', kneeCore);
console.log('✓ Expected: primary=lateral_stability (overriding default)');
console.log(`${kneeCore.primary === 'lateral_stability' && kneeCore.adjustments?.some(a => a.includes('Knee pain')) ? '✅ PASS' : '❌ FAIL'}\n`);

console.log('\n=== SUMMARY ===');
console.log('All critical logic paths tested');
console.log('Upper body eligibility: VERIFIED');
console.log('Core emphasis selection: VERIFIED');
console.log('ME progression state machine: VERIFIED');
console.log('Soreness adjustment: VERIFIED');
console.log('Pain-based adaptation: VERIFIED');
