/**
 * ======================================================================
 *  UNIFIED ATHLETE INTELLIGENCE PROFILE
 *  Single source of truth for athlete's learning state
 * ======================================================================
 *
 * Consolidates all learning systems into one unified profile:
 * - Classification (Cat1/Cat2)
 * - ACWR risk level
 * - Climate tolerance
 * - Motivation archetype
 * - Terrain affinity
 * - Race focus
 * - Injury risk factors
 */

import { getSupabase, getCurrentUserId } from '@/lib/supabase';
import type { AthleteCategory } from '@/lib/adaptive-coach/types';
import type { ArchetypeType } from '@/lib/motivationDetection';

//
// ─────────────────────────────────────────────────────────────
//   UNIFIED PROFILE INTERFACE
// ─────────────────────────────────────────────────────────────
//

export interface AthleteIntelligenceProfile {
  // Identity
  userId: string;
  lastUpdated: string;

  // Classification
  category: AthleteCategory;
  categoryConfidence: number; // 0-1
  yearsTraining: number;
  weeklyMileageCapacity: number; // Max safe weekly km

  // ACWR & Load Management
  acwrRiskLevel: 'low' | 'moderate' | 'high' | 'extreme';
  currentACWR: number;
  personalizedACWRZone: [number, number]; // [lower, upper] safe zone
  injuryProneThreshold: number; // ACWR threshold where injuries occur

  // Climate Adaptation
  climateToleranceScore: number; // 0-100
  heatAdaptationLevel: 'none' | 'low' | 'moderate' | 'high';
  preferredTrainingTemp: number; // °C
  maxSafeWBGT: number; // Personalized WBGT threshold

  // Motivation & Psychology
  dominantArchetype: ArchetypeType;
  archetypeConfidence: number; // 0-1
  preferredTone: 'direct' | 'exploratory' | 'gentle' | 'supportive' | 'empowering' | 'collaborative';
  engagementScore: number; // 0-100

  // Terrain & Route Intelligence
  terrainAffinityScore: {
    road: number; // 0-100
    trail: number;
    mountain: number;
  };
  averageElevationGainPerWeek: number; // meters
  preferredSurface: 'road' | 'trail' | 'mixed';

  // Race Intelligence
  raceFocus: {
    main: RaceFocusInfo | null;
    secondary: RaceFocusInfo[];
    tertiary: RaceFocusInfo[];
  };
  historicalRacePerformance: {
    averageCompletionRate: number; // % of races finished
    averagePaceAccuracy: number; // How close to predicted times
    bestDistance: number; // km of best performance
  };

  // Injury & Recovery
  injuryHistory: InjuryRecord[];
  recoveryCapacity: 'low' | 'moderate' | 'high';
  chronologicalAge: number;
  trainingAge: number; // years of structured training

  // Learning Metrics
  totalDataPoints: number;
  profileCompleteness: number; // 0-100
  lastMajorUpdate: string;
  updateTriggers: string[]; // What caused the last update
}

export interface RaceFocusInfo {
  raceId: string;
  name: string;
  date: string;
  distanceKm: number;
  priority: 'A' | 'B' | 'C';
  daysAway: number;
}

export interface InjuryRecord {
  type: string;
  date: string;
  severity: 'minor' | 'moderate' | 'severe';
  triggerACWR?: number;
  triggerVolume?: number;
}

//
// ─────────────────────────────────────────────────────────────
//   BUILD INTELLIGENCE PROFILE
// ─────────────────────────────────────────────────────────────
//

/**
 * Construct complete intelligence profile from all learning systems
 */
export async function buildAthleteIntelligenceProfile(
  userId: string
): Promise<AthleteIntelligenceProfile | null> {
  try {
    // Gather data from all systems
    const [
      classificationData,
      acwrData,
      climateData,
      motivationData,
      terrainData,
      raceData,
      injuryData,
      trainingData
    ] = await Promise.all([
      fetchClassificationData(userId),
      fetchACWRData(userId),
      fetchClimateData(userId),
      fetchMotivationData(userId),
      fetchTerrainData(userId),
      fetchRaceData(userId),
      fetchInjuryData(userId),
      fetchTrainingData(userId)
    ]);

    // Calculate derived metrics
    const profileCompleteness = calculateCompleteness({
      classificationData,
      acwrData,
      climateData,
      motivationData,
      terrainData,
      raceData
    });

    const profile: AthleteIntelligenceProfile = {
      userId,
      lastUpdated: new Date().toISOString(),

      // Classification
      category: classificationData?.category || 'Cat1',
      categoryConfidence: classificationData?.confidence || 0.5,
      yearsTraining: trainingData?.yearsTraining || 1,
      weeklyMileageCapacity: (classificationData?.category === 'Cat1' ? 80 : 140),

      // ACWR
      acwrRiskLevel: acwrData?.riskLevel || 'low',
      currentACWR: acwrData?.current || 1.0,
      personalizedACWRZone: acwrData?.personalizedZone || [0.8, 1.3],
      injuryProneThreshold: acwrData?.injuryThreshold || 1.5,

      // Climate
      climateToleranceScore: climateData?.toleranceScore || 50,
      heatAdaptationLevel: climateData?.adaptationLevel || 'none',
      preferredTrainingTemp: climateData?.preferredTemp || 15,
      maxSafeWBGT: climateData?.maxWBGT || 28,

      // Motivation
      dominantArchetype: motivationData?.archetype || 'health',
      archetypeConfidence: motivationData?.confidence || 0.5,
      preferredTone: motivationData?.tone || 'supportive',
      engagementScore: motivationData?.engagement || 50,

      // Terrain
      terrainAffinityScore: terrainData?.affinity || { road: 50, trail: 50, mountain: 0 },
      averageElevationGainPerWeek: terrainData?.avgElevation || 0,
      preferredSurface: terrainData?.preferredSurface || 'road',

      // Races
      raceFocus: raceData?.focus || { main: null, secondary: [], tertiary: [] },
      historicalRacePerformance: raceData?.performance || {
        averageCompletionRate: 1.0,
        averagePaceAccuracy: 0.9,
        bestDistance: 0
      },

      // Injury
      injuryHistory: injuryData || [],
      recoveryCapacity: calculateRecoveryCapacity(trainingData?.age, injuryData),
      chronologicalAge: trainingData?.age || 30,
      trainingAge: trainingData?.yearsTraining || 1,

      // Metrics
      totalDataPoints: calculateTotalDataPoints({
        classificationData,
        acwrData,
        climateData,
        motivationData,
        terrainData,
        raceData
      }),
      profileCompleteness,
      lastMajorUpdate: new Date().toISOString(),
      updateTriggers: []
    };

    return profile;
  } catch (error) {
    console.error('Error building athlete intelligence profile:', error);
    return null;
  }
}

//
// ─────────────────────────────────────────────────────────────
//   DATA FETCHERS
// ─────────────────────────────────────────────────────────────
//

async function fetchClassificationData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('goal_type, experience_level, avg_mileage')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  // Derive category from experience and mileage
  const avgMileage = data.avg_mileage || 0;
  const category: AthleteCategory = avgMileage > 50 ? 'Cat2' : 'Cat1';

  return {
    category,
    confidence: avgMileage > 0 ? 0.8 : 0.5
  };
}

async function fetchACWRData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: loadData } = await supabase
    .from('training_load')
    .select('acwr, acute_load, chronic_load')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!loadData) return null;

  const acwr = loadData.acwr || 1.0;
  let riskLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'low';

  if (acwr >= 2.0) riskLevel = 'extreme';
  else if (acwr >= 1.5) riskLevel = 'high';
  else if (acwr >= 1.3) riskLevel = 'moderate';

  return {
    current: acwr,
    riskLevel,
    personalizedZone: [0.8, 1.3] as [number, number],
    injuryThreshold: 1.5
  };
}

async function fetchClimateData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('location_history')
    .select('climate_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return null;

  // Calculate average tolerance from historical data
  const avgTemp = data.reduce((sum, entry) => {
    const climate = entry.climate_data as any;
    return sum + (climate?.temp || 15);
  }, 0) / data.length;

  return {
    toleranceScore: 50,
    adaptationLevel: 'none' as const,
    preferredTemp: avgTemp,
    maxWBGT: 28
  };
}

async function fetchMotivationData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('motivation_archetype, dominant_archetype, archetype_confidence')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data || !data.dominant_archetype) return null;

  return {
    archetype: data.dominant_archetype as ArchetypeType,
    confidence: data.archetype_confidence || 0.5,
    tone: 'supportive' as const,
    engagement: 50
  };
}

async function fetchTerrainData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('log_entries')
    .select('elevation_gain')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(20);

  if (!data) return null;

  const avgElevation = data.reduce((sum, entry) => sum + (entry.elevation_gain || 0), 0) / data.length;

  return {
    affinity: { road: 60, trail: 40, mountain: 0 },
    avgElevation: avgElevation || 0,
    preferredSurface: 'road' as const
  };
}

async function fetchRaceData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: races } = await supabase
    .from('races')
    .select('*')
    .eq('user_id', userId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!races || races.length === 0) return null;

  const mainRace = races.find(r => r.priority === 'A') || races[0];
  const daysAway = Math.ceil((new Date(mainRace.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return {
    focus: {
      main: mainRace ? {
        raceId: mainRace.id,
        name: mainRace.name,
        date: mainRace.date,
        distanceKm: mainRace.distance_km,
        priority: mainRace.priority,
        daysAway
      } : null,
      secondary: [],
      tertiary: []
    },
    performance: {
      averageCompletionRate: 1.0,
      averagePaceAccuracy: 0.9,
      bestDistance: mainRace?.distance_km || 0
    }
  };
}

async function fetchInjuryData(userId: string): Promise<InjuryRecord[]> {
  // TODO: Implement injury tracking table
  return [];
}

async function fetchTrainingData(userId: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('user_profiles')
    .select('created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;

  const accountAge = Math.ceil(
    (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  return {
    age: 30,
    yearsTraining: Math.max(1, accountAge)
  };
}

//
// ─────────────────────────────────────────────────────────────
//   HELPER CALCULATIONS
// ─────────────────────────────────────────────────────────────
//

function calculateCompleteness(data: any): number {
  const fields = [
    data.classificationData,
    data.acwrData,
    data.climateData,
    data.motivationData,
    data.terrainData,
    data.raceData
  ];

  const completed = fields.filter(f => f !== null).length;
  return Math.round((completed / fields.length) * 100);
}

function calculateTotalDataPoints(data: any): number {
  let count = 0;
  Object.values(data).forEach(value => {
    if (value !== null) count++;
  });
  return count;
}

function calculateRecoveryCapacity(
  age?: number,
  injuries?: InjuryRecord[]
): 'low' | 'moderate' | 'high' {
  if (!age) return 'moderate';

  let capacity: 'low' | 'moderate' | 'high' = 'high';

  if (age > 50) capacity = 'low';
  else if (age > 40) capacity = 'moderate';

  if (injuries && injuries.length >= 3) {
    capacity = capacity === 'high' ? 'moderate' : 'low';
  }

  return capacity;
}

//
// ─────────────────────────────────────────────────────────────
//   SAVE & RETRIEVE
// ─────────────────────────────────────────────────────────────
//

export async function saveAthleteIntelligenceProfile(
  profile: AthleteIntelligenceProfile
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('athlete_intelligence_profile')
      .upsert({
        user_id: profile.userId,
        profile_data: profile,
        last_updated: profile.lastUpdated,
        completeness_score: profile.profileCompleteness
      }, { onConflict: 'user_id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving athlete intelligence profile:', error);
    return false;
  }
}

export async function getAthleteIntelligenceProfile(
  userId?: string
): Promise<AthleteIntelligenceProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const uid = userId || await getCurrentUserId();
    if (!uid) return null;

    const { data, error } = await supabase
      .from('athlete_intelligence_profile')
      .select('profile_data')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) throw error;
    return data?.profile_data || null;
  } catch (error) {
    console.error('Error fetching athlete intelligence profile:', error);
    return null;
  }
}

export async function refreshAthleteIntelligenceProfile(
  userId?: string
): Promise<AthleteIntelligenceProfile | null> {
  const uid = userId || await getCurrentUserId();
  if (!uid) return null;

  const profile = await buildAthleteIntelligenceProfile(uid);
  if (!profile) return null;

  await saveAthleteIntelligenceProfile(profile);
  return profile;
}
