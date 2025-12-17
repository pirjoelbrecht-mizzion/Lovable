# Vercel Cache Issue - Fixed

## Problem
The "This Week" plan was disappearing on Vercel because the **service worker was caching old JavaScript bundles**. When you deployed new code, users were still loading the old version from their browser cache.

## What Was Fixed

### 1. Service Worker Cache Version Updated
- Changed cache from `mizzion-v1` to `mizzion-v2025-12-17-01`
- This forces all cached content to refresh on next deployment

### 2. Smart Fetch Strategy
- **JavaScript bundles**: Network-first (always try to get latest)
- **HTML pages**: Network-first (fresh content)
- **Assets (CSS/images)**: Cache-first with fallback

### 3. Vercel Cache Headers
Added proper HTTP cache headers:
- `index.html`: Always revalidate (no caching)
- `sw.js`: Always revalidate (no caching)
- `assets/*`: Long-term caching (1 year, immutable)

### 4. Service Worker Auto-Update
- Checks for updates every 60 seconds
- Automatically reloads page when new version available
- Handles controller changes gracefully

### 5. Plan State Protection
- Added validation to prevent invalid plans from clearing content
- Loading indicator shows "Optimizing..." during plan computation
- Fallback to default plan if data loading fails

## Deployment Steps

### For This Fix to Work:

1. **Deploy to Vercel**
   ```bash
   git add .
   git commit -m "Fix: Service worker cache preventing updates"
   git push
   ```

2. **Clear Vercel Cache** (Important!)
   - Go to your Vercel project dashboard
   - Click "Deployments" → Find latest deployment
   - Click the three dots → "Redeploy"
   - Check "Use existing Build Cache" and **UNCHECK IT**
   - Click "Redeploy"

3. **Clear Browser Cache** (For existing users)
   Users need to:
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"
   - Or visit the site in incognito mode to verify

4. **Verify the Fix**
   - Open https://mizzion.vercel.app/quest
   - Open browser console (F12)
   - Look for: `[SW] Registered successfully`
   - Check that plan shows and stays visible
   - Wait 60 seconds - if there's an update, it will auto-reload

## For Future Deployments

**Each time you deploy significant changes**, update the cache version in `public/sw.js`:

```javascript
const CACHE = "mizzion-v2025-12-17-02"; // Increment the number
```

This ensures users get fresh content immediately.

## Browser Console Logs

After deployment, users should see:
```
[SW] Registered successfully
[Quest] Initial weekPlan loaded: 7 days
[Quest] Plan updated via event
```

If you see:
```
[Quest] Invalid initial plan, creating default
[Quest] Received invalid plan update, ignoring
```
This means the validation is working correctly - it's preventing bad data from clearing the plan.

## Monitoring

Watch for these console messages:
- `[SW] New version available, reloading...` - Auto-update working
- `[Quest] Module 4 adjusted plan received` - Adaptive system working
- `[Quest] Applying adjusted plan` - Plan successfully loaded

## Emergency: Disable Service Worker

If issues persist, you can temporarily disable the service worker by commenting out in `src/main.tsx`:
```typescript
// registerSW(); // Temporarily disabled
```

Then redeploy. This removes offline functionality but ensures fresh content.
