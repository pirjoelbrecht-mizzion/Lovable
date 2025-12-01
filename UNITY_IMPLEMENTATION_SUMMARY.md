# Unity Community Feature - Implementation Summary

## Overview

Unity is a hybrid local/virtual running companion matching system integrated into the Mizzion training app. It helps runners aged 18-30 find compatible training partners based on pace, schedule, terrain preferences, and location.

## Key Features Implemented

### 1. Database Schema
- **community_profiles** table: Stores user community preferences, pace ranges, availability, terrain preferences, and location (PostGIS geography points)
- **community_connections** table: Tracks bilateral relationships between runners with status tracking
- **run_invites** table: Manages invitations for local meetups and virtual synchronized runs
- Comprehensive Row Level Security (RLS) policies ensuring privacy
- Spatial indexes for efficient proximity queries

### 2. Intelligent Matching Algorithm
- **Two-stage hybrid matching**:
  - Stage 1: Search within 25km radius (local matches)
  - Stage 2: If < 5 local matches, automatically expand to virtual matches worldwide
- **Match scoring algorithm** (0-100 points):
  - Pace overlap: 40-50 points
  - Schedule alignment: 30 points
  - Terrain compatibility: 20 points
  - Proximity bonus: 10 points (local only)
- Real-time filtering by terrain, days, and pace range

### 3. User Interface Components

#### FindCompanions Page
- Grid/card layout for displaying matches
- Filter controls: terrain, days of week, match type (local/virtual/all)
- Visual differentiation: local matches (cyan gradient), virtual matches (purple gradient)
- Match score badges with color coding
- Empty states with helpful messaging

#### MyProfile Page
- Bio editor (200 character limit, youth-friendly)
- Pace range sliders (min/max pace in min/km)
- Terrain preference selector (road/trail/track/mixed)
- Weekly availability selector (visual day buttons)
- Preferred run times (early morning to evening)
- Match preference toggle (local/virtual/both)
- Location sharing controls with privacy explanations
- Visibility toggles for profile and "looking for partner" status

#### Connections Page
- Stats dashboard showing:
  - Total connections
  - Runs completed together
  - Total kilometers together
  - Pending invites count
- Tabbed interface: "My Connections" and "Pending Requests"
- Accept/decline connection requests
- Connection type badges (local/virtual)

#### RunnerCard Component
- Displays runner profile with match quality score
- Shows pace range, terrain, availability, and preferred run times
- Distance display for local matches
- "Connect" and "Invite to Run" action buttons
- Color-coded match scores (green: 80+, cyan: 60-79, orange: 40-59)

### 4. Navigation Integration
- Unity tab in bottom navigation with 🤝 icon
- Red notification badge showing pending connection requests
- Badge updates every 60 seconds automatically
- Changed from 🏢 to 🤝 for better community representation

### 5. Privacy & Safety Features
- Location shared as proximity only (e.g., "2.3 km away"), never exact coordinates
- Visibility opt-in required before profile appears in searches
- "Looking for partner" toggle for active search status
- Location sharing separate toggle from visibility
- Privacy notices throughout the interface

### 6. TypeScript Type System
Complete type definitions for:
- CommunityProfile, CompanionMatch, CommunityConnection
- RunInvite, CommunityStats, SearchFilters
- Enums for terrain, match types, connection status, invite status
- Helper constants for UI options (days, run times, terrain, match preferences)

### 7. React Hooks & Utilities
- **useCommunitySearch**: Manages search state, filters, and auto-refresh
- **Database helpers** (lib/community.ts):
  - Profile CRUD operations
  - Connection management
  - Invite system
  - Stats retrieval
- Integration with existing location utilities

### 8. Supabase RPC Functions
- `find_companions`: Main matching function with hybrid logic
- `get_pending_connection_count`: Badge count for UI
- `accept_connection_request`: Creates reciprocal connections
- `get_mutual_training_days`: Finds schedule overlaps
- `update_community_last_active`: Activity tracking
- `get_community_stats`: Aggregate statistics

## Design Philosophy

### Youth-Focused (18-30 Demographics)
- Modern gradient backgrounds (cyan, purple, lime accents)
- Casual, encouraging language ("Find your running crew", "Squad up")
- Instagram-story style day selectors
- Micro-interactions and smooth transitions
- Mobile-first responsive design

### Hybrid Local/Virtual Model
- Default: 25km local search radius
- Automatic virtual expansion when local density is low
- Clear visual distinction between match types
- No user left without matches (growth-focused)

### Completely Free
- No premium features or paywalls
- Focus on growth and network effects
- Unity acts as retention and engagement driver

### Privacy-First
- Opt-in only for all sharing
- Location as proximity, never coordinates
- Clear privacy explanations throughout
- User controls at every level

## Technical Architecture

### Database Layer
- PostGIS for geographic queries
- Efficient spatial indexes
- Comprehensive RLS policies
- Reciprocal connection handling
- Automatic timestamp management

### Application Layer
- React components with TypeScript
- Custom hooks for state management
- Supabase client integration
- Real-time badge updates
- Auto-refresh search results (30 sec)

### Matching Logic
- SQL-based scoring algorithm
- Two-stage search with fallback
- Configurable filters
- Sort by match score and proximity

## What's NOT Included (Phase 2 Features)

Deferred to maintain MVP scope:
- Group runs (3+ people)
- Premium features
- Virtual run live tracking with Supabase Realtime
- Instagram/Strava story sharing
- Advanced gamification beyond basic badges
- Community-created events
- Leaderboards and competitive features
- AI coach Unity suggestions (basic framework only)

## Next Steps for Development

1. **User Testing**: Deploy to beta users, gather feedback on matching quality
2. **AI Coach Integration**: Add Unity-aware suggestions in training plans
3. **Onboarding Flow**: Add Unity opt-in step to user onboarding
4. **Analytics**: Track adoption rates, connection success, retention impact
5. **Virtual Run Tech**: Build Supabase Realtime live tracking for virtual partnerships
6. **Group Runs**: Add when user density reaches critical mass (>10 users per city)

## Database Migrations Applied

1. `20251110100140_create_unity_community_tables.sql`: Core tables and RLS
2. `20251110100231_create_unity_matching_functions.sql`: RPC functions for matching

## Files Created

### Types & Utilities
- `src/types/community.ts`: Complete type system
- `src/lib/community.ts`: Database helpers
- `src/hooks/useCommunitySearch.ts`: Search hook

### Components
- `src/components/RunnerCard.tsx`: Match display component

### Pages
- `src/pages/Unity.tsx`: Main Unity page (updated)
- `src/pages/Unity/FindCompanions.tsx`: Discovery interface
- `src/pages/Unity/MyProfile.tsx`: Profile management
- `src/pages/Unity/Connections.tsx`: Connection management

### Infrastructure
- `supabase/migrations/`: Two new migration files
- Updated `src/App.tsx`: Badge integration

## Success Metrics to Track

- **Adoption**: Unity opt-in rate (target: 30% within 3 months)
- **Engagement**: Connections per active Unity user (target: 2+ within 30 days)
- **Retention**: Users completing runs with partners (target: 40% of connections)
- **Growth**: Viral coefficient from invites (target: 0.3+)
- **Satisfaction**: 4+ star partner ratings (target: 85%+)
- **Balance**: Local vs virtual acceptance rates

## Build Status

✅ All TypeScript files compile successfully
✅ Build completed with no errors
✅ Bundle size: 1,090 kB (314 kB gzipped)

## Ready for Production

The Unity community feature is fully implemented and ready for deployment. The hybrid local/virtual matching system provides a solid foundation for building a thriving running community while maintaining the app's clean, personal feel.
