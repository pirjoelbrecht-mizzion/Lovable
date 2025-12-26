import {
  determineUpperBodyEligibility,
  determineCoreEmphasis,
  calculateMEProgressionState,
  calculateSorenessAdjustment,
} from './src/services/coreTrainingService';

console.log('=== TEST 1: Trail runner, no poles ===');
const user1 = determineUpperBodyEligibility(
  { isSkimoAthlete: false, usesPoles: false, hasGymAccess: true, hasSteepHills: true },
  'ultra'
);
console.log('Upper body eligibility:', user1);
console.log('Expected: eligible=false, type=none');

const user1Core = determineCoreEmphasis('ultra', [], false);
console.log('Core emphasis:', user1Core);
console.log('Expected: primary=lateral_stability, secondary=anti_rotation');

console.log('\n=== TEST 2: Trail runner with poles ===');
const user2 = determineUpperBodyEligibility(
  { isSkimoAthlete: false, usesPoles: true, hasGymAccess: true, hasSteepHills: true },
  'ultra'
);
console.log('Upper body eligibility:', user2);
console.log('Expected: eligible=true, type=maintenance');

const user2Core = determineCoreEmphasis('ultra', [], true);
console.log('Core emphasis:', user2Core);
console.log('Expected: anti_rotation should be elevated due to poles');

console.log('\n=== TEST 3: Skimo athlete ===');
const user3 = determineUpperBodyEligibility(
  { isSkimoAthlete: true, usesPoles: true, hasGymAccess: true, hasSteepHills: true },
  'skimo'
);
console.log('Upper body eligibility:', user3);
console.log('Expected: eligible=true, type=full');

const user3Core = determineCoreEmphasis('skimo', [], false);
console.log('Core emphasis:', user3Core);
console.log('Expected: primary=anti_rotation');

console.log('\n=== TEST 4: VK runner ===');
const vkCore = determineCoreEmphasis('vk', [], false);
console.log('VK core emphasis:', vkCore);
console.log('Expected: primary=anti_extension');

console.log('\n=== TEST 5: ME Progression state machine ===');
const prog1 = calculateMEProgressionState(new Date('2024-12-15'), new Date('2024-12-22'), 5);
console.log('7 days since last ME:', prog1);
console.log('Expected: action=advance, target=6');

const prog2 = calculateMEProgressionState(new Date('2024-12-01'), new Date('2024-12-22'), 5);
console.log('21 days since last ME:', prog2);
console.log('Expected: action=regress or restart');

console.log('\n=== TEST 6: Soreness adjustment ===');
const soreness1 = calculateSorenessAdjustment(3, 24);
console.log('Soreness 3/10 for 24h:', soreness1);
console.log('Expected: multiplier=1.0 (no adjustment)');

const soreness2 = calculateSorenessAdjustment(5, 60);
console.log('Soreness 5/10 for 60h:', soreness2);
console.log('Expected: multiplier=0.7 (30% reduction)');
