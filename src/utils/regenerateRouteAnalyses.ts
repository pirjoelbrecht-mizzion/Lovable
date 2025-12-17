import { supabase } from '@/lib/supabase';
import { analyzeGPXRoutePersonalized, analyzeGPXRouteForUltra } from '@/utils/personalizedGPXAnalysis';
import { saveGPXAnalysisToEvent } from '@/lib/gpxStorage';

export async function regenerateAllRouteAnalyses() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, type, distance_km, gpx_parsed_data')
    .not('gpx_parsed_data', 'is', null);

  if (error) {
    console.error('Error fetching events:', error);
    return { success: false, error };
  }

  if (!events || events.length === 0) {
    console.log('No events with GPX data found');
    return { success: true, updated: 0 };
  }

  let updated = 0;
  const errors = [];

  for (const event of events) {
    try {
      console.log(`Regenerating analysis for event: ${event.name}`);

      const points = event.gpx_parsed_data as any[];
      const basicResult = await analyzeGPXRoutePersonalized(points);
      const analysis = basicResult.analysis;

      const isUltraDistance = event.distance_km && event.distance_km > 42;

      if (isUltraDistance) {
        const ultraResult = await analyzeGPXRouteForUltra(points, {
          surfaceType: event.type === 'trail' ? 'trail' : 'road',
          athleteExperienceLevel: 'intermediate',
        });

        const analysisToSave = {
          ...analysis,
          totalTimeEstimate: ultraResult.ultraAdjusted.totalTimeMin,
          ultraAdjusted: true,
          ultraBreakdown: ultraResult.breakdown,
          fatiguePenaltyMin: ultraResult.ultraAdjusted.fatiguePenaltyMin,
          aidStationTimeMin: ultraResult.ultraAdjusted.aidStationTimeMin,
        };

        await saveGPXAnalysisToEvent(
          event.id,
          { points: analysis.elevationProfile },
          analysisToSave
        );
      } else {
        await saveGPXAnalysisToEvent(
          event.id,
          { points: analysis.elevationProfile },
          analysis
        );
      }

      updated++;
      console.log(`✓ Updated ${event.name}`);
    } catch (err) {
      console.error(`Error updating ${event.name}:`, err);
      errors.push({ event: event.name, error: err });
    }
  }

  return { success: true, updated, errors };
}
