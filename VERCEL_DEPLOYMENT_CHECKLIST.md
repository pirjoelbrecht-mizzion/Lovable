# Vercel Deployment Checklist & Troubleshooting Guide

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Configuration

**CRITICAL:** These MUST be set in Vercel Dashboard → Your Project → Settings → Environment Variables

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://dronbejexqytdumvglda.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Mapbox (for maps - REQUIRED if using route features)
VITE_MAPBOX_TOKEN=pk.eyJ1IjoidW5idG4iLCJhIjoiY21oeH...

# OpenAI (OPTIONAL - for AI features)
VITE_OPENAI_API_KEY=sk-proj-...

# Strava (OPTIONAL - for Strava integration)
VITE_STRAVA_CLIENT_ID=185151
VITE_STRAVA_API_TOKEN=58d80d031ccffd71aa2b9000d6d86c9a050cdeb3
```

**How to set in Vercel:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Settings" → "Environment Variables"
4. Add each variable for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### 2. Build Configuration

**Verify in Vercel Dashboard → Project Settings → Build & Development Settings:**

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 3. Required Files

Ensure these files exist in your repository:

- ✅ `vercel.json` (for SPA routing)
- ✅ `package.json` (with correct scripts)
- ✅ `.gitignore` (excluding node_modules, dist, .env)

---

## 🔍 Authentication Error Debugging

### Step 1: Check Browser Console

When the error occurs, open Browser DevTools (F12) and look for:

```javascript
[Onboarding] Checking session...
[Onboarding] User authenticated: user@example.com
[Onboarding] Detecting motivation archetype...
[Onboarding] Saving user profile...
[Onboarding] Profile saved successfully
[Onboarding] Completing onboarding...
[Onboarding] Onboarding completed successfully
```

**If you see an error instead**, note the exact error message.

### Step 2: Common Error Patterns

#### Error: "Supabase client not initialized"
**Cause:** Environment variables not set in Vercel
**Fix:**
1. Go to Vercel Dashboard → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Redeploy

#### Error: "Session expired. Please sign in again."
**Cause:** Onboarding took > 1 hour OR session was cleared
**Fix:**
- Sign in again
- Complete onboarding faster
- Check if browser is blocking cookies

#### Error: "Failed to save user profile"
**Cause:** RLS policy blocking insert OR network timeout
**Fix:**
1. Check Supabase Dashboard → Table Editor → user_profiles
2. Verify RLS is enabled with proper policies
3. Test with: `SELECT * FROM user_profiles WHERE user_id = auth.uid()`

#### Error: "CORS error" or "Network request failed"
**Cause:** Environment variables incorrect OR Supabase project paused
**Fix:**
1. Verify Supabase URL and key are correct
2. Check Supabase project status at https://supabase.com/dashboard
3. Ensure project isn't paused

### Step 3: Test Authentication Flow

1. **Open browser console** (F12)
2. **Navigate to:** https://your-app.vercel.app/auth
3. **Sign in with test account:** test@gmail.com
4. **Watch console for logs**
5. **Complete onboarding**
6. **Note any errors**

---

## 🚀 Deployment Steps

### Option A: Deploy via GitHub (Recommended)

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Fix authentication and add error logging"
   git push origin main
   ```

2. **Vercel auto-deploys** (if connected to GitHub)

3. **Check deployment status:**
   - Go to https://vercel.com/dashboard
   - Click on your project
   - View "Deployments" tab
   - Wait for "Ready" status

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Option C: Manual Deployment

1. Build locally:
   ```bash
   npm run build
   ```

2. Go to Vercel Dashboard → New Project
3. Import from Git or drag-and-drop `dist` folder

---

## 🐛 Troubleshooting Specific Issues

### Issue: "404: NOT_FOUND" on any route except `/`

**Diagnosis:** SPA routing not configured
**Solution:** Ensure `vercel.json` exists with:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Issue: White screen / "Something went wrong"

**Diagnosis:** Build error or missing environment variables
**Solution:**

1. Check Vercel build logs:
   - Dashboard → Project → Deployments → Click deployment → "Build Logs"

2. Look for errors like:
   ```
   TypeError: Cannot read property 'VITE_SUPABASE_URL' of undefined
   ```

3. Add missing environment variables

### Issue: Authentication works locally but not on Vercel

**Diagnosis:** Environment variables not deployed
**Solution:**

1. **Verify in browser console:**
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   // Should NOT be undefined
   ```

2. **If undefined:** Environment variables not set in Vercel
3. **Add them and redeploy**

### Issue: "Invalid JWT" or "JWT expired"

**Diagnosis:** Session token expired
**Solution:**

1. **Clear browser storage:**
   - DevTools → Application → Local Storage → Clear All
   - DevTools → Application → Cookies → Clear All

2. **Sign in again**

3. **If persists:** Check Supabase JWT secret hasn't changed

---

## 📝 Post-Deployment Verification

### Test Checklist:

- [ ] Homepage loads: `https://your-app.vercel.app/`
- [ ] Auth page loads: `https://your-app.vercel.app/auth`
- [ ] Sign in works
- [ ] Onboarding flow completes
- [ ] `/quest` page loads after onboarding
- [ ] Refresh on `/quest` still works (no 404)
- [ ] Browser console shows no errors

### Performance Checks:

- [ ] Build size < 3MB
- [ ] Page load < 3 seconds
- [ ] No console warnings
- [ ] Mobile responsive

---

## 🆘 Emergency Rollback

If deployment breaks production:

1. **In Vercel Dashboard:**
   - Go to "Deployments"
   - Find last working deployment
   - Click "⋯" → "Promote to Production"

2. **This immediately reverts** to the previous version

---

## 📞 Support Resources

- **Vercel Status:** https://www.vercel-status.com/
- **Supabase Status:** https://status.supabase.com/
- **Vercel Docs:** https://vercel.com/docs/errors/DEPLOYMENT_NOT_FOUND

---

## 🎯 Quick Reference

**Most Common Issues:**
1. ❌ Environment variables not set → Add in Vercel Dashboard
2. ❌ Missing `vercel.json` → Add SPA rewrite rules
3. ❌ Session expired → Sign in again
4. ❌ Build fails → Check build logs for specific error

**Expected Flow:**
1. User signs up/in → `/auth`
2. Redirected to onboarding → `/onboarding`
3. Completes onboarding
4. Profile saved to Supabase
5. Redirected to → `/quest`
6. All routes work (no 404)

**If error at step 5:**
- Check browser console for specific error
- Verify environment variables are set
- Check Supabase RLS policies
- Test database connection

---

## 📊 Monitoring

Add these to track issues in production:

1. **Vercel Analytics:** Enable in project settings
2. **Error tracking:** Console logs now include `[Onboarding]` prefix
3. **Supabase logs:** Dashboard → Logs → Filter by user email

**Example: Finding user's error:**
```sql
-- In Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'user@example.com';
SELECT * FROM user_profiles WHERE user_id = '<user_id_from_above>';
```
