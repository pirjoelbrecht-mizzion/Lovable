import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching BT2 event...');

  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, type, distance_km, gpx_parsed_data, user_id')
    .eq('name', 'BT2')
    .eq('user_id', 'ca0b035b-f149-4403-8cd9-0ab850e1c2f2')
    .single();

  if (error || !event) {
    console.error('Error fetching event:', error);
    return;
  }

  console.log('Event found:', event.name);
  console.log('Has GPX data:', !!event.gpx_parsed_data);
  console.log('Distance:', event.distance_km, 'km');

  if (!event.gpx_parsed_data) {
    console.error('No GPX data found!');
    return;
  }

  const points = event.gpx_parsed_data as any[];
  console.log('GPX points:', points.length);

  // Import analysis functions dynamically
  const { analyzeGPXRoutePersonalized, analyzeGPXRouteForUltra } = await import('./src/utils/personalizedGPXAnalysis.js');
  const { saveGPXAnalysisToEvent } = await import('./src/lib/gpxStorage.js');

  console.log('Running personalized analysis...');
  const basicResult = await analyzeGPXRoutePersonalized(points);
  const analysis = basicResult.analysis;

  console.log('Basic analysis:', {
    distance: analysis.totalDistanceKm,
    elevation: analysis.totalElevationGainM,
    baseTime: analysis.totalTimeEstimate,
    personalized: analysis.usingPersonalizedPace,
    confidence: analysis.paceConfidence,
  });

  const isUltraDistance = event.distance_km && event.distance_km > 42;
  console.log('Is ultra distance:', isUltraDistance);

  if (isUltraDistance) {
    console.log('Running ultra-distance analysis...');
    const ultraResult = await analyzeGPXRouteForUltra(points, {
      surfaceType: event.type === 'trail' ? 'trail' : 'road',
      athleteExperienceLevel: 'intermediate',
    });

    console.log('Ultra analysis:', {
      baseTime: ultraResult.base.totalTimeMin,
      fatiguePenalty: ultraResult.ultraAdjusted.fatiguePenaltyMin,
      aidStationTime: ultraResult.ultraAdjusted.aidStationTimeMin,
      totalTime: ultraResult.ultraAdjusted.totalTimeMin,
    });

    const analysisToSave = {
      ...analysis,
      totalTimeEstimate: ultraResult.ultraAdjusted.totalTimeMin,
      ultraAdjusted: true,
      ultraBreakdown: ultraResult.breakdown,
      fatiguePenaltyMin: ultraResult.ultraAdjusted.fatiguePenaltyMin,
      aidStationTimeMin: ultraResult.ultraAdjusted.aidStationTimeMin,
    };

    console.log('Saving ultra analysis...');
    await saveGPXAnalysisToEvent(
      event.id,
      { points: analysis.elevationProfile },
      analysisToSave
    );
  } else {
    console.log('Saving basic analysis...');
    await saveGPXAnalysisToEvent(
      event.id,
      { points: analysis.elevationProfile },
      analysis
    );
  }

  console.log('✓ Analysis regenerated successfully!');
  console.log('Refresh Race Mode to see updated time');
}

main().catch(console.error);
