# Trail Runner Chart Setup Guide

## ✅ Integration Complete

The trail running load tracking chart is now integrated into the Insights page!

## 🎯 How It Works

The chart **automatically appears** for trail runners when:
1. You're on the **Insights page** (Mirror → Insights tab)
2. Viewing **weekly data** (not daily)
3. Your profile indicates you're a trail runner

## 🏔️ How to Enable Trail Runner Mode

The system detects trail runners based on your profile. You need **any one** of these conditions:

### Option 1: Surface Type (Easiest)
In your profile settings or during onboarding, set:
- `surface: 'trail'` or `surface: 'mixed'`

### Option 2: Goal Type
- `goalType: 'ultra'`

### Option 3: Strength Preference
- `strengthPreference: 'mountain'` or `strengthPreference: 'ultra'`

## 🔧 Quick Setup via Browser Console

If you want to test it right now without changing your actual profile, open the browser console and run:

```javascript
// Get current profile
const { supabase } = await import('/src/lib/supabase.ts');
const { data: { user } } = await supabase.auth.getUser();

// Update to trail runner
await supabase
  .from('user_profiles')
  .update({ surface: 'trail' })
  .eq('user_id', user.id);

// Reload the page
window.location.reload();
```

## 📊 What You'll See

When trail mode is active, the Insights page shows:

### Instead of Standard Chart:
```
Weekly Training Load
📊 [Simple bar chart showing distance only]
```

### You Get Advanced Trail Chart:
```
Weekly Distance & Vertical Gain
📏 Distance bars (colored by safety: 🟢🟡🔴)
🧗‍♂️ Vertical gain line with dots
💪 Combined load shaded area
⚠️ Safety warnings when load increases >10%
💡 Load summary showing distance + vertical equivalents
```

## 🧪 Testing With Sample Data

Currently the chart needs **real log entries** with vertical data. To test:

1. **Add some runs with vertical gain:**
   - Go to Log page
   - Add runs with `verticalM` field populated
   - Make sure they span multiple weeks

2. **Or import from Strava:**
   - Strava imports include elevation data automatically
   - Go to Settings → Connect → Strava

3. **Or manually set your profile to trail:**
   - See "Quick Setup" above

## 🎨 Chart Features

When active, you get:

✅ **Combined Load Tracking**
- Normalizes vertical gain to distance equivalent
- Shows total training load (distance + normalized vertical)

✅ **10% Rule Enforcement**
- Color-coded bars: Green (safe), Yellow (caution), Red (over limit)
- Tracks distance, vertical, AND combined load progression

✅ **Safety Warnings**
- Automatic alerts when load increases too quickly
- Specific recommendations based on which metric exceeded limits

✅ **Adaptive Configuration**
- Beginner: 100m vertical ≈ 1km distance
- Advanced mountain runners: 80m vertical ≈ 1km distance
- Adjusts based on your experience level

## 🔍 Troubleshooting

### Chart Not Showing?
Check:
1. Are you viewing **weekly** data? (Change resolution if on "daily")
2. Is your profile set to trail mode? (Run detection test below)
3. Do your log entries have `verticalM` data?

### Test Trail Detection:
```javascript
// In browser console
const { isTrailRunner } = await import('/src/utils/trailLoad.ts');
const { getCurrentUserProfile } = await import('/src/lib/userProfile.ts');
const profile = await getCurrentUserProfile();
console.log('Is trail runner:', isTrailRunner(profile));
console.log('Profile:', profile);
```

### Still Not Working?
- Clear cache and reload
- Check browser console for errors
- Verify log entries have vertical data: `console.log(entries.map(e => e.verticalM))`

## 📚 Next Steps

1. **Set your profile to trail mode** (any method above)
2. **Add runs with elevation data** (or import from Strava)
3. **Visit Insights page** → Weekly tab
4. **See the enhanced trail runner chart!**

## 🚀 Future Enhancements

Coming soon:
- [ ] Automatic alerts sent to coach when unsafe progression detected
- [ ] ACWR integration with combined load
- [ ] Terrain difficulty multipliers
- [ ] Altitude adjustment factors
- [ ] Weather impact on load calculation

---

**Need Help?**
- Check TRAIL_LOAD_TRACKING_SYSTEM.md for technical details
- See sample implementation in TrailLoadDemo.tsx
- Review trailLoad.ts utility functions
