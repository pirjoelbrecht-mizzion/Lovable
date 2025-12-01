/**
 * CRITICAL: 2-Year Data Import Limitation
 *
 * This module enforces a strict 2-year limitation on all data imports
 * to prevent database bloat and maintain system performance.
 *
 * Applied to:
 * - CSV imports (Strava, Garmin, etc.)
 * - API imports (Strava, COROS, Garmin, Polar, Suunto, Oura, Apple Health)
 * - Any other data ingestion mechanisms
 */

export interface ImportDateValidation {
  isValid: boolean;
  cutoffDate: Date;
  cutoffDateISO: string;
  reason?: string;
}

export interface ImportFilterResult<T> {
  accepted: T[];
  rejected: T[];
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    oldestAccepted?: string;
    oldestRejected?: string;
  };
}

/**
 * Maximum age in years for imported data
 */
export const MAX_IMPORT_AGE_YEARS = 2;

/**
 * Calculate the cutoff date for data imports (2 years ago from today)
 */
export function getImportCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MAX_IMPORT_AGE_YEARS);
  cutoff.setHours(0, 0, 0, 0); // Start of day
  return cutoff;
}

/**
 * Get the cutoff date as ISO string (YYYY-MM-DD)
 */
export function getImportCutoffDateISO(): string {
  return getImportCutoffDate().toISOString().slice(0, 10);
}

/**
 * Validate if a date is within the 2-year import window
 *
 * @param dateISO - Date string in ISO format (YYYY-MM-DD)
 * @returns Validation result with cutoff information
 */
export function validateImportDate(dateISO: string): ImportDateValidation {
  const cutoffDate = getImportCutoffDate();
  const cutoffDateISO = cutoffDate.toISOString().slice(0, 10);

  try {
    const activityDate = new Date(dateISO);

    if (isNaN(activityDate.getTime())) {
      return {
        isValid: false,
        cutoffDate,
        cutoffDateISO,
        reason: 'Invalid date format'
      };
    }

    const isValid = activityDate >= cutoffDate;

    return {
      isValid,
      cutoffDate,
      cutoffDateISO,
      reason: isValid ? undefined : `Date ${dateISO} is older than ${MAX_IMPORT_AGE_YEARS} years (cutoff: ${cutoffDateISO})`
    };
  } catch (error) {
    return {
      isValid: false,
      cutoffDate,
      cutoffDateISO,
      reason: `Error parsing date: ${error}`
    };
  }
}

/**
 * Filter an array of items by date, keeping only those within 2-year window
 *
 * @param items - Array of items to filter
 * @param getDate - Function to extract date from each item
 * @returns Filtered results with statistics
 */
export function filterByImportDateLimit<T>(
  items: T[],
  getDate: (item: T) => string
): ImportFilterResult<T> {
  const cutoffDate = getImportCutoffDate();
  const accepted: T[] = [];
  const rejected: T[] = [];

  let oldestAcceptedDate: Date | null = null;
  let oldestRejectedDate: Date | null = null;

  for (const item of items) {
    const dateISO = getDate(item);
    const validation = validateImportDate(dateISO);

    if (validation.isValid) {
      accepted.push(item);

      const itemDate = new Date(dateISO);
      if (!oldestAcceptedDate || itemDate < oldestAcceptedDate) {
        oldestAcceptedDate = itemDate;
      }
    } else {
      rejected.push(item);

      const itemDate = new Date(dateISO);
      if (!isNaN(itemDate.getTime())) {
        if (!oldestRejectedDate || itemDate < oldestRejectedDate) {
          oldestRejectedDate = itemDate;
        }
      }
    }
  }

  return {
    accepted,
    rejected,
    stats: {
      total: items.length,
      accepted: accepted.length,
      rejected: rejected.length,
      oldestAccepted: oldestAcceptedDate ? oldestAcceptedDate.toISOString().slice(0, 10) : undefined,
      oldestRejected: oldestRejectedDate ? oldestRejectedDate.toISOString().slice(0, 10) : undefined,
    }
  };
}

/**
 * Get a human-readable message about the import date limitation
 */
export function getImportLimitMessage(rejectedCount: number, oldestRejected?: string): string {
  const cutoffISO = getImportCutoffDateISO();

  if (rejectedCount === 0) {
    return `All activities are within the ${MAX_IMPORT_AGE_YEARS}-year import window (since ${cutoffISO}).`;
  }

  const oldestInfo = oldestRejected ? ` (oldest: ${oldestRejected})` : '';

  return `⚠️ ${rejectedCount} activit${rejectedCount === 1 ? 'y' : 'ies'} excluded: older than ${MAX_IMPORT_AGE_YEARS} years (cutoff: ${cutoffISO})${oldestInfo}. Only activities from the last ${MAX_IMPORT_AGE_YEARS} years are imported.`;
}

/**
 * Calculate date range for API requests with 2-year limit
 *
 * @param requestedStartDate - Optional start date requested by user
 * @returns Validated date range for API request
 */
export function getValidatedAPIDateRange(requestedStartDate?: string): {
  startDate: string;
  endDate: string;
  wasLimited: boolean;
} {
  const cutoffDate = getImportCutoffDate();
  const cutoffISO = getImportCutoffDateISO();
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  let startDate = requestedStartDate || cutoffISO;
  let wasLimited = false;

  // Validate and limit the start date
  const requestDate = new Date(startDate);
  if (requestDate < cutoffDate) {
    startDate = cutoffISO;
    wasLimited = true;
  }

  return {
    startDate,
    endDate: todayISO,
    wasLimited
  };
}

/**
 * Log import filtering statistics to console
 */
export function logImportFilterStats(
  source: string,
  stats: ImportFilterResult<any>['stats']
): void {
  console.log(`[${source}] Import Filter Results:`, {
    total: stats.total,
    accepted: stats.accepted,
    rejected: stats.rejected,
    acceptanceRate: `${((stats.accepted / stats.total) * 100).toFixed(1)}%`,
    cutoffDate: getImportCutoffDateISO(),
    maxAgeYears: MAX_IMPORT_AGE_YEARS,
    oldestAccepted: stats.oldestAccepted,
    oldestRejected: stats.oldestRejected,
  });
}
