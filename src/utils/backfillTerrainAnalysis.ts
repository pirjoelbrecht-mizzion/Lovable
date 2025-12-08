/**
 * Utility to backfill terrain analysis for existing Strava activities
 *
 * Run this from browser console:
 * import('@/utils/backfillTerrainAnalysis').then(m => m.backfillTerrainAnalysis())
 */

import { supabase } from '@/lib/supabase';
import { terrainAnalysisProcessor } from '@/services/terrainAnalysisProcessor';

export async function backfillTerrainAnalysis(limit = 50): Promise<void> {
  console.log('🔄 Starting terrain analysis backfill...');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user');
    return;
  }

  const { data: activities, error } = await supabase
    .from('log_entries')
    .select('id, external_id, source, title, date')
    .eq('user_id', user.id)
    .eq('source', 'strava')
    .not('external_id', 'is', null)
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activities:', error);
    return;
  }

  if (!activities || activities.length === 0) {
    console.log('No Strava activities found');
    return;
  }

  console.log(`Found ${activities.length} Strava activities to analyze`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      console.log(`Processing: ${activity.title} (${activity.date})`);

      const { data: existingAnalysis } = await supabase
        .from('activity_terrain_analysis')
        .select('id')
        .eq('log_entry_id', activity.id)
        .maybeSingle();

      if (existingAnalysis) {
        console.log(`  ⏭️  Skipping - already analyzed`);
        skipped++;
        continue;
      }

      await terrainAnalysisProcessor.triggerManualAnalysis(
        activity.id,
        activity.external_id!
      );

      processed++;
      console.log(`  ✅ Analyzed (${processed}/${activities.length})`);

      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      failed++;
      console.error(`  ❌ Failed:`, err);
    }
  }

  console.log('\n📊 Backfill Summary:');
  console.log(`  ✅ Processed: ${processed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('  ✓ Complete!');
}

export async function analyzeSpecificActivity(logEntryId: string): Promise<void> {
  console.log(`Analyzing activity: ${logEntryId}`);

  const { data: activity } = await supabase
    .from('log_entries')
    .select('external_id, source')
    .eq('id', logEntryId)
    .maybeSingle();

  if (!activity) {
    console.error('Activity not found');
    return;
  }

  if (activity.source !== 'strava' || !activity.external_id) {
    console.error('Activity is not from Strava or missing external ID');
    return;
  }

  await terrainAnalysisProcessor.triggerManualAnalysis(
    logEntryId,
    activity.external_id
  );

  console.log('✅ Analysis complete!');
}
