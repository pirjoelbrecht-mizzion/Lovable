# Disappearing Bubbles - Root Cause & Fix

## The Bug
Bubbles on the Quest page were disappearing after ~3 seconds on Vercel (but working fine in development).

## Root Cause Analysis

### What Was Happening:
1. Quest page loads successfully with 7-day plan from localStorage
2. Module 4 Adaptive Engine auto-executes on mount (autoExecute: true)
3. If Module 4 encounters **any error** (authentication, missing data, context build failure):
   - It would still try to convert the result to a plan
   - Could generate an **empty or partial plan** (< 7 days)
   - **Saved this invalid plan to localStorage** without validation
   - Overwrote the good plan
4. Quest page received the invalid plan and either:
   - Displayed empty bubbles, or
   - Crashed trying to render invalid data
5. Result: Bubbles disappear after 3 seconds (the time Module 4 takes to execute and fail)

### Why It Worked in Development:
- Development has more complete data/context
- Shorter network latency
- Likely authenticated with valid Supabase session
- Module 4 would succeed more often

### Why It Failed on Vercel:
- Users might not be authenticated
- Missing or incomplete data in context
- Network timeouts
- Module 4 would fail silently and save invalid plans

## The Fix

### 1. Plan Validation Before Save (useAdaptiveTrainingPlan.ts)
```typescript
// Validate plan before saving - CRITICAL to prevent clearing valid plans
if (!localStoragePlan || localStoragePlan.length !== 7) {
  throw new Error(`Invalid plan generated: ${localStoragePlan?.length || 0} days instead of 7`);
}

// Validate each day has at least one session
const invalidDays = localStoragePlan.filter(day => !day.sessions || day.sessions.length === 0);
if (invalidDays.length > 0) {
  throw new Error(`Invalid plan: ${invalidDays.length} days without sessions`);
}
```

**Result**: Module 4 will throw an error instead of saving invalid plans.

### 2. Base Plan Validation (useAdaptiveTrainingPlan.ts)
```typescript
// Validate base plan before proceeding
if (!plan || plan.length !== 7) {
  throw new Error(`Cannot execute with invalid base plan: ${plan?.length || 0} days`);
}
```

**Result**: Module 4 won't even try to execute if starting data is invalid.

### 3. Double Validation in Quest Page (Quest.tsx)
```typescript
onPlanAdjusted: (decision, plan) => {
  // Extra validation - only accept valid 7-day plans
  if (plan && plan.length === 7 && plan.every(day => day.sessions && day.sessions.length > 0)) {
    setWeekPlan(plan);
  } else {
    console.error('[Quest] Received invalid plan from Module 4, ignoring');
  }
}
```

**Result**: Quest page won't accept invalid plans even if Module 4 somehow sends them.

### 4. useEffect Validation (Quest.tsx)
```typescript
useEffect(() => {
  if (adjustedPlan && adjustedPlan.length === 7 && adjustedPlan.every(day => day.sessions && day.sessions.length > 0)) {
    setWeekPlan(adjustedPlan);
  } else if (adjustedPlan) {
    console.error('[Quest] Adjusted plan is invalid, keeping current plan');
  }
}, [adjustedPlan]);
```

**Result**: Multiple layers of protection.

## Testing the Fix

### 1. Local Testing
```bash
npm run build
npm run preview
```
Open http://localhost:4173/quest and:
- Check browser console for `[Quest] Initial weekPlan loaded: 7 days`
- Verify bubbles appear and stay visible
- Wait 5 seconds to ensure they don't disappear
- Check for any Module 4 errors in console

### 2. Vercel Testing
After deploying:

**Clear your browser cache first!**
1. Open DevTools (F12)
2. Right-click refresh → "Empty Cache and Hard Reload"
3. Or use Incognito mode

Then verify:
```
✅ Bubbles appear
✅ Bubbles stay visible after 3+ seconds
✅ Console shows: [Quest] Initial weekPlan loaded: 7 days
✅ Console shows: [Module 4] Execution completed successfully (if auth works)
OR
✅ Console shows: [Module 4] error: Cannot execute... (if auth fails - THIS IS GOOD)
✅ Bubbles remain visible even if Module 4 fails
```

### 3. What Success Looks Like
- Bubbles are always visible on page load
- If Module 4 succeeds, bubbles may update with adaptive adjustments
- If Module 4 fails, bubbles stay with the original plan
- **No blank screen, no disappearing bubbles**

### 4. What You Might See in Console (All Normal)
```
// Success case:
[Module 4] Execution completed successfully
[Quest] Plan validated, applying

// Expected failure (not authenticated):
[Module 4] User not authenticated, skipping database logging
[Module 4] Execution completed successfully

// Protected failure (invalid plan):
[Module 4] Generated invalid plan, refusing to save: 5 days
[Quest] Received invalid plan from Module 4, ignoring
// Bubbles stay visible!
```

## If Issues Persist

### Check localStorage:
```javascript
// In browser console:
JSON.parse(localStorage.getItem('weekPlan'))
```
Should return an array of 7 objects, each with a `sessions` array.

### Clear localStorage manually:
```javascript
// In browser console:
localStorage.clear()
location.reload()
```

### Disable Module 4 temporarily:
In `Quest.tsx`, change:
```typescript
autoExecute: false,  // Was: true
```

### Check Supabase Authentication:
Module 4 needs auth to work properly. Verify user is signed in.

## Bonus Fixes Included

### Service Worker Cache Refresh
- Updated cache version to force fresh JavaScript
- Network-first strategy for JS bundles
- Auto-reload when new version detected

### Vercel Cache Headers
- Prevent stale HTML/JS from being cached
- Proper immutable caching for assets

## Summary
The disappearing bubbles were caused by Module 4's adaptive engine overwriting valid plans with invalid ones when it encountered errors. Now, multiple layers of validation ensure that **only valid 7-day plans with all sessions** can be saved or displayed. If Module 4 fails, the user keeps seeing their last valid plan.
