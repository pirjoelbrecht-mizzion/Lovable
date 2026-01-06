// Force regenerate the adaptive training plan
// Run with: npx tsx force-regenerate-plan.ts

import { supabase } from './src/lib/supabase';
import { clearAdaptiveExecutionLock } from './src/lib/adaptiveExecutionLock';

async function forceRegeneratePlan() {
  console.log('🔧 Force regenerating adaptive training plan...\n');

  // Step 1: Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('❌ Error: Not logged in', userError);
    return;
  }

  console.log('✅ User ID:', user.id);

  // Step 2: Clear the execution lock
  console.log('\n🔓 Clearing execution lock...');
  clearAdaptiveExecutionLock();
  console.log('✅ Execution lock cleared');

  // Step 3: Delete current week's plan from database
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  const weekStart = monday.toISOString().slice(0, 10);

  console.log('\n🗑️  Deleting current week plan:', weekStart);

  const { error: deleteError } = await supabase
    .from('training_plans')
    .delete()
    .eq('user_id', user.id)
    .eq('week_start_date', weekStart);

  if (deleteError) {
    console.error('❌ Error deleting plan:', deleteError);
  } else {
    console.log('✅ Current week plan deleted');
  }

  console.log('\n✨ Done! Refresh the app to regenerate the plan.\n');
  console.log('📝 The new plan will be generated when you reload the Quest page.');

  process.exit(0);
}

forceRegeneratePlan().catch(console.error);
