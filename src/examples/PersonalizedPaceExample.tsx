/**
 * Example: Using the Personalized Pace System
 *
 * This file demonstrates how to integrate the personalized pace calculation
 * into your components for GPX route analysis.
 */

import { useState } from 'react';
import { analyzeGPXRoutePersonalized, compareGPXEstimates } from '@/utils/personalizedGPXAnalysis';
import { PaceProfileCard } from '@/components/PaceProfileCard';
import type { GPXPoint } from '@/utils/gpxParser';

export function PersonalizedPaceExample() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);

  // Example: Analyze a GPX route with personalized pace
  async function handleAnalyzeRoute(gpxPoints: GPXPoint[]) {
    try {
      const result = await analyzeGPXRoutePersonalized(gpxPoints);

      console.log('Route Analysis:', result.analysis);
      console.log('Using Personalized Pace:', result.hasPersonalizedPace);
      console.log('Pace Confidence:', result.analysis.paceConfidence);

      if (result.paceProfile) {
        console.log('Pace Profile:', {
          flatPace: result.paceProfile.baseFlatPaceMinKm,
          uphillFactor: result.paceProfile.uphillAdjustmentFactor,
          downhillFactor: result.paceProfile.downhillAdjustmentFactor,
          sampleSize: result.paceProfile.sampleSize,
        });
      }

      setAnalysis(result);
    } catch (err) {
      console.error('Failed to analyze route:', err);
    }
  }

  // Example: Compare personalized vs default estimates
  async function handleCompareEstimates(gpxPoints: GPXPoint[]) {
    try {
      const result = await compareGPXEstimates(gpxPoints);

      if (result) {
        console.log('Personalized Time:', result.personalizedAnalysis.totalTimeEstimate, 'min');
        console.log('Default Time:', result.defaultAnalysis.totalTimeEstimate, 'min');
        console.log('Time Difference:', result.comparison.timeDifferenceMin, 'min');
        console.log('Percent Difference:', result.comparison.percentDifference, '%');
        console.log('Faster with Personalized:', result.comparison.fasterWithPersonalized);

        setComparison(result);
      }
    } catch (err) {
      console.error('Failed to compare estimates:', err);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Personalized Pace System</h1>

      {/* Show the user's pace profile */}
      <PaceProfileCard />

      {/* Display route analysis results */}
      {analysis && (
        <div style={{
          marginTop: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Route Analysis</h2>

          <div style={{ marginBottom: '16px' }}>
            <strong>Using Personalized Pace:</strong>{' '}
            {analysis.hasPersonalizedPace ? 'Yes' : 'No'}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Confidence Level:</strong>{' '}
            {analysis.analysis.paceConfidence}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Estimated Time:</strong>{' '}
            {formatTime(analysis.analysis.totalTimeEstimate)}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Total Distance:</strong>{' '}
            {analysis.analysis.totalDistanceKm} km
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>Elevation Gain:</strong>{' '}
            {analysis.analysis.totalElevationGainM} m
          </div>
        </div>
      )}

      {/* Display comparison results */}
      {comparison && (
        <div style={{
          marginTop: '24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ marginTop: 0 }}>Estimate Comparison</h2>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Method</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Estimated Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
                  Personalized
                </td>
                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                  {formatTime(comparison.personalizedAnalysis.totalTimeEstimate)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
                  Default
                </td>
                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
                  {formatTime(comparison.defaultAnalysis.totalTimeEstimate)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <strong>Difference</strong>
                </td>
                <td style={{
                  padding: '8px',
                  borderTop: '1px solid #e5e7eb',
                  textAlign: 'right',
                  color: comparison.comparison.fasterWithPersonalized ? '#16a34a' : '#dc2626',
                }}>
                  <strong>
                    {comparison.comparison.fasterWithPersonalized ? '-' : '+'}
                    {Math.abs(comparison.comparison.timeDifferenceMin).toFixed(1)} min
                    ({comparison.comparison.percentDifference}%)
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>

          {comparison.comparison.significantDifference && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '6px',
              fontSize: '14px',
            }}>
              Your personalized pace shows a significant difference from the default estimate.
              This suggests your actual performance differs from standard assumptions.
            </div>
          )}
        </div>
      )}

      {/* Example usage instructions */}
      <div style={{
        marginTop: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <h3 style={{ marginTop: 0 }}>How to Use</h3>

        <h4>1. Basic GPX Analysis with Personalized Pace:</h4>
        <pre style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '13px',
        }}>
{`import { analyzeGPXRoutePersonalized } from '@/utils/personalizedGPXAnalysis';

const result = await analyzeGPXRoutePersonalized(gpxPoints);

// result.analysis - GPX route analysis with personalized time estimates
// result.paceProfile - User's pace profile (if available)
// result.hasPersonalizedPace - Whether personalized pace was used`}
        </pre>

        <h4>2. Compare Personalized vs Default Estimates:</h4>
        <pre style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '13px',
        }}>
{`import { compareGPXEstimates } from '@/utils/personalizedGPXAnalysis';

const result = await compareGPXEstimates(gpxPoints);

// result.personalizedAnalysis - Analysis with personalized pace
// result.defaultAnalysis - Analysis with default pace
// result.comparison - Comparison metrics`}
        </pre>

        <h4>3. Display User's Pace Profile:</h4>
        <pre style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '13px',
        }}>
{`import { PaceProfileCard } from '@/components/PaceProfileCard';

<PaceProfileCard />`}
        </pre>

        <h4>4. Manual Profile Calculation:</h4>
        <pre style={{
          backgroundColor: 'white',
          padding: '12px',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '13px',
        }}>
{`import { recalculatePaceProfile } from '@/engine/historicalAnalysis/calculateUserPaceProfile';
import { analyzeUserActivities } from '@/engine/historicalAnalysis/analyzeActivityTerrain';

// First analyze activities
await analyzeUserActivities();

// Then calculate pace profile
const profile = await recalculatePaceProfile();`}
        </pre>
      </div>
    </div>
  );
}

function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}
