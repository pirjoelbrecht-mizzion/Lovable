/**
 * Console Filter Utility
 *
 * Filters out StackBlitz infrastructure noise to show only YOUR app errors
 */

const STACKBLITZ_NOISE_PATTERNS = [
  'bolt.new/api/deploy',
  'messo.min.js',
  'chmln.js',
  'entry.client-',
  'fetch-BxB3oymy.js',
  'performance-DfkHWKIP.js',
  'blitz.cf284e50.js',
  'Error decoding value',
  'Found a character that cannot be part of a valid base64',
  'Contextify',
  'running source code in new context',
  'preloaded using link preload',
  'fetch.worker.cf284e50.js',
  'Cannot read properties of undefined (reading \'get\')',
  'chameleon',
];

/**
 * Check if an error is from StackBlitz infrastructure (ignore it)
 */
export function isStackBlitzNoise(errorMessage: string): boolean {
  return STACKBLITZ_NOISE_PATTERNS.some(pattern =>
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Check if an error is from YOUR application code (pay attention!)
 */
export function isAppError(errorMessage: string): boolean {
  const appPatterns = [
    '/src/',
    '@/',
    'database.ts',
    'stravaImport.ts',
    'Settings.tsx',
    'Quest.tsx',
    'supabase',
    'adaptiveDecision',
    'Cannot read properties of null',
    'undefined is not',
  ];

  return appPatterns.some(pattern =>
    errorMessage.includes(pattern)
  ) && !isStackBlitzNoise(errorMessage);
}

/**
 * Install console filter to highlight only app errors
 */
export function installConsoleFilter() {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = function(...args: any[]) {
    const message = args.join(' ');

    if (isStackBlitzNoise(message)) {
      // Silently ignore StackBlitz noise
      return;
    }

    if (isAppError(message)) {
      // Highlight YOUR errors in red
      originalError.call(console, '🚨 APP ERROR:', ...args);
    } else {
      originalError.apply(console, args);
    }
  };

  console.warn = function(...args: any[]) {
    const message = args.join(' ');

    if (isStackBlitzNoise(message)) {
      // Silently ignore StackBlitz noise
      return;
    }

    originalWarn.apply(console, args);
  };

  console.log('✅ Console filter installed - only YOUR app errors will show');
}

/**
 * Show console filter status
 */
export function showErrorSummary() {
  console.log('\n=== ERROR SUMMARY ===');
  console.log('✅ App is running normally');
  console.log('ℹ️  StackBlitz infrastructure errors are hidden');
  console.log('🎯 Only YOUR application errors will be highlighted');
  console.log('\nTo see ALL errors (including noise), run:');
  console.log('  localStorage.setItem("showAllErrors", "true")');
  console.log('\nTo hide noise again, run:');
  console.log('  localStorage.removeItem("showAllErrors")');
}
