/**
 * Test: ME/Z3 Spacing Validation
 *
 * Verifies that ME sessions respect 72h separation from Z3/Z4 workouts
 *
 * Rule: ME never stacks with hard running within same 72-hour window
 */

interface WorkoutSession {
  date: Date;
  type: 'me' | 'z3' | 'z4' | 'easy' | 'rest';
  title: string;
}

/**
 * Checks if an ME session is scheduled too close to a Z3/Z4 workout
 * @param sessions Array of scheduled workouts
 * @returns Validation result with details
 */
function validateMESpacing(sessions: WorkoutSession[]): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (let i = 0; i < sortedSessions.length; i++) {
    const session = sortedSessions[i];

    if (session.type === 'me') {
      // Check 72h before and after
      for (let j = 0; j < sortedSessions.length; j++) {
        if (i === j) continue;

        const other = sortedSessions[j];
        if (other.type === 'z3' || other.type === 'z4') {
          const timeDiff = Math.abs(session.date.getTime() - other.date.getTime());
          const hoursDiff = timeDiff / (60 * 60 * 1000);

          if (timeDiff < SEVENTY_TWO_HOURS_MS) {
            violations.push(
              `ME session on ${session.date.toISOString().slice(0, 10)} is ${hoursDiff.toFixed(1)}h from ${other.type.toUpperCase()} session on ${other.date.toISOString().slice(0, 10)} (minimum: 72h)`
            );
          }
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

// Test Cases
console.log('=== ME/Z3 Spacing Validation Tests ===\n');

// Test 1: Valid spacing - ME on Monday, Z3 on Friday (4 days = 96h)
console.log('Test 1: Valid spacing (4 days apart)');
const test1: WorkoutSession[] = [
  { date: new Date('2025-12-23'), type: 'me', title: 'ME Session' },
  { date: new Date('2025-12-27'), type: 'z3', title: 'Z3 Uphill' },
];
const result1 = validateMESpacing(test1);
console.log(`Result: ${result1.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result1.valid) console.log('Violations:', result1.violations);
console.log('');

// Test 2: Invalid spacing - ME on Monday, Z3 on Wednesday (48h)
console.log('Test 2: Invalid spacing (2 days apart - 48h)');
const test2: WorkoutSession[] = [
  { date: new Date('2025-12-23'), type: 'me', title: 'ME Session' },
  { date: new Date('2025-12-25'), type: 'z3', title: 'Z3 Uphill' },
];
const result2 = validateMESpacing(test2);
console.log(`Result: ${result2.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result2.valid) console.log('Violations:', result2.violations);
console.log('');

// Test 3: Valid - ME on Monday, Z4 on Friday (96h)
console.log('Test 3: Valid spacing with Z4 (4 days apart)');
const test3: WorkoutSession[] = [
  { date: new Date('2025-12-23'), type: 'me', title: 'ME Session' },
  { date: new Date('2025-12-27'), type: 'z4', title: 'Z4 Threshold' },
];
const result3 = validateMESpacing(test3);
console.log(`Result: ${result3.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result3.valid) console.log('Violations:', result3.violations);
console.log('');

// Test 4: Invalid - ME on Thursday, Z3 on Tuesday (2 days before = 48h)
console.log('Test 4: Invalid spacing - Z3 before ME (2 days = 48h)');
const test4: WorkoutSession[] = [
  { date: new Date('2025-12-24'), type: 'z3', title: 'Z3 Uphill' },
  { date: new Date('2025-12-26'), type: 'me', title: 'ME Session' },
];
const result4 = validateMESpacing(test4);
console.log(`Result: ${result4.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result4.valid) console.log('Violations:', result4.violations);
console.log('');

// Test 5: Valid - ME with easy runs only
console.log('Test 5: Valid - ME with only easy runs (no hard sessions)');
const test5: WorkoutSession[] = [
  { date: new Date('2025-12-23'), type: 'easy', title: 'Easy Run' },
  { date: new Date('2025-12-24'), type: 'me', title: 'ME Session' },
  { date: new Date('2025-12-25'), type: 'easy', title: 'Easy Run' },
  { date: new Date('2025-12-26'), type: 'rest', title: 'Rest Day' },
];
const result5 = validateMESpacing(test5);
console.log(`Result: ${result5.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result5.valid) console.log('Violations:', result5.violations);
console.log('');

// Test 6: Edge case - exactly 72h (should be valid)
console.log('Test 6: Edge case - exactly 72h (should be valid)');
const meDate = new Date('2025-12-23T08:00:00');
const z3Date = new Date('2025-12-26T08:00:00');
const test6: WorkoutSession[] = [
  { date: meDate, type: 'me', title: 'ME Session' },
  { date: z3Date, type: 'z3', title: 'Z3 Uphill' },
];
const result6 = validateMESpacing(test6);
console.log(`Result: ${result6.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!result6.valid) console.log('Violations:', result6.violations);
console.log('');

// Summary
const allTests = [result1, result2, result3, result4, result5, result6];
const passedTests = allTests.filter(r => r.valid).length;
const failedTests = allTests.length - passedTests;

console.log('=== Test Summary ===');
console.log(`Total Tests: ${allTests.length}`);
console.log(`Expected Passes: 4 (tests 1, 3, 5, 6)`);
console.log(`Expected Failures: 2 (tests 2, 4)`);
console.log('');
console.log(`Actual Passes: ${passedTests}`);
console.log(`Actual Failures: ${failedTests}`);
console.log('');

// Verify expected results
const expectedResults = [true, false, true, false, true, true];
const allCorrect = allTests.every((result, i) => result.valid === expectedResults[i]);

if (allCorrect) {
  console.log('✅ ALL TESTS PASSED - ME/Z3 spacing validation is working correctly!');
} else {
  console.log('❌ SOME TESTS FAILED - ME/Z3 spacing validation has issues!');
  console.log('\nExpected vs Actual:');
  allTests.forEach((result, i) => {
    const expected = expectedResults[i] ? 'PASS' : 'FAIL';
    const actual = result.valid ? 'PASS' : 'FAIL';
    const match = expected === actual ? '✅' : '❌';
    console.log(`  Test ${i + 1}: Expected ${expected}, Got ${actual} ${match}`);
  });
}
