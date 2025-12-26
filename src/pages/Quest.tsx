import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import QuickAddRace from "@/components/QuickAddRace";
import WeatherAlertBanner from "@/components/WeatherAlertBanner";
import { getWeekPlan, defaultWeek, type WeekPlan, todayDayIndex } from "@/lib/plan";
import { fetchDailyWeather, type DailyWeather, getWeatherForLocation, type CurrentWeather } from "@/utils/weather";
import { loadUserProfile } from "@/state/userData";
import { loadWeekPlan } from "@/utils/weekPlan";
import { listRaces, type Race } from "@/utils/races";
import { load, save } from "@/utils/storage";
import { toast } from "@/components/ToastHost";
import { getSavedLocation, detectLocation, saveLocation, ensureLocationLabel } from "@/utils/location";
import { showImmediateWeatherAlert } from "@/services/weatherNotifications";
import { useAdaptiveTrainingPlan } from "@/hooks/useAdaptiveTrainingPlan";
import { PostWorkoutFeedbackModal } from "@/components/PostWorkoutFeedbackModal";
import { getLogEntries, syncLogEntries } from "@/lib/database";
import { completeWorkoutWithFeedback, getCompletionStatusForWeek } from "@/services/workoutCompletionService";
import type { LogEntry } from "@/types";
import { TodayTrainingMobile } from "@/components/today/TodayTrainingMobile";
import { useTodayTrainingData } from "@/hooks/useTodayTrainingData";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { getUserSettings } from "@/lib/userSettings";
import { buildAthleteProfile, calculateReadiness, type AthleteProfile } from "@/lib/adaptive-coach";
import { Calendar, Flag, Map, Thermometer, Users, Zap, ChevronRight, Activity, TrendingUp, Mountain } from "lucide-react";
import { useStrengthTraining } from "@/hooks/useStrengthTraining";
import { useCoreTraining } from "@/hooks/useCoreTraining";
import { MESessionInline } from "@/components/MESessionInline";
import { CoreSessionCard } from "@/components/CoreSessionCard";
import { CosmicWeekView } from "@/components/CosmicWeekView";
import { LiveWorkoutTracker } from "@/components/strength/LiveWorkoutTracker";
import { supabase } from "@/lib/supabase";
import "./Quest.css";

type SessionNode = {
  id: string;
  day: string;
  dayFull: string;
  type: string;
  emoji: string;
  duration: string;
  distance?: string;
  elevation?: number;
  pace?: string;
  zones?: string;
  description?: string;
  weather?: { temp: number; condition: string; icon: string };
  completed: boolean;
  isToday: boolean;
  isAdapted: boolean;
  isMESession: boolean;
  x: number;
  y: number;
  size: number;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAYS_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const BUBBLE_POSITIONS = [
  { x: 25, y: 14, size: 76 },
  { x: 68, y: 22, size: 94 },
  { x: 42, y: 33, size: 72 },
  { x: 75, y: 44, size: 80 },
  { x: 30, y: 57, size: 68 },
  { x: 58, y: 70, size: 90 },
  { x: 22, y: 82, size: 74 },
];

const WEATHER_ICONS: Record<string, string> = {
  sun: "☀️",
  "cloud-sun": "⛅",
  cloud: "☁️",
  rain: "🌧️",
  "rain-heavy": "⛈️",
  storm: "⛈️",
  snow: "🌨️",
  fog: "🌫️",
};

const SESSION_EMOJIS: Record<string, string> = {
  rest: "😌",
  recovery: "🧘",
  easy: "🏃",
  tempo: "⚡",
  intervals: "🔥",
  long: "🏔️",
  strength: "💪",
  workout: "🔥",
};


function getMonday() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function detectSessionType(title: string, notes?: string, explicitType?: string): string {
  // If explicit type is provided, trust it
  if (explicitType) {
    const validTypes = ['strength', 'rest', 'recovery', 'easy', 'tempo', 'intervals', 'long', 'workout'];
    if (validTypes.includes(explicitType)) {
      return explicitType;
    }
  }

  const text = `${title} ${notes || ""}`.toLowerCase();
  // Check for strength training first (highest priority)
  if (/strength|gym|lift|weights|me session/i.test(text)) return "strength";
  if (/rest|off|mobility|recover/i.test(text)) return "rest";
  if (/recovery/i.test(text)) return "recovery";
  if (/tempo|quality|threshold/i.test(text)) return "tempo";
  if (/interval|speed|rep|hill/i.test(text)) return "intervals";
  if (/long|endurance/i.test(text)) return "long";
  if (/workout|hard/i.test(text)) return "workout";
  return "easy";
}

function estimateDuration(km?: number, type?: string): string {
  if (!km || km === 0) {
    if (type === "rest") return "0 min";
    if (type === "strength") return "40 min";
    return "30 min";
  }
  const baseMinPerKm = type === "intervals" ? 5 : type === "tempo" ? 5.5 : 6;
  const mins = Math.round(km * baseMinPerKm);
  return `${mins} min`;
}

export default function Quest() {
  const t = useT();
  const [openQuick, setOpenQuick] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);
  const [viewMode, setViewMode] = useState<"bubbles" | "list" | "mobile" | "cosmic">("cosmic");
  const [selectedSession, setSelectedSession] = useState<SessionNode | null>(null);
  const [liveWorkoutMode, setLiveWorkoutMode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  // Get strength training data
  const { meAssignment, loadRegulation, coachingMessage, templates: meTemplates } = useStrengthTraining(null, 'base');

  // Get core training data
  const {
    selectedCoreSession,
    coreEmphasis,
    coreFrequency,
    sorenessAdjustment,
  } = useCoreTraining({
    raceType: 'trail',
    period: 'base',
  });

  const [weekPlan, setWeekPlan] = useState<WeekPlan>(() => {
    const plan = getWeekPlan();
    console.log('[Quest] Initial weekPlan loaded:', plan?.length, 'days');
    // Ensure we always have a valid 7-day plan
    if (!plan || plan.length !== 7) {
      console.error('[Quest] Invalid initial plan, creating default');
      return defaultWeek();
    }
    return plan;
  });
  const [weatherData, setWeatherData] = useState<DailyWeather[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPositions, setTempPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [swappingWith, setSwappingWith] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedListItem, setDraggedListItem] = useState<string | null>(null);
  const [dragOverListItem, setDragOverListItem] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);

  // Compact stats state
  const [athleteStats, setAthleteStats] = useState<{
    readiness: string;
    readinessScore: number;
    weeklyVolume: number;
    vertical: number;
    units: 'metric' | 'imperial';
  } | null>(null);

  // Workout feedback and completion
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedWorkoutForFeedback, setSelectedWorkoutForFeedback] = useState<{
    session: SessionNode;
    logEntry: LogEntry;
  } | null>(null);
  const [weekLogEntries, setWeekLogEntries] = useState<LogEntry[]>([]);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});

  const today = todayDayIndex();
  const profile = loadUserProfile();

  // Adaptive Decision Engine - single source of truth for training plans
  const {
    adjustedPlan,
    decision: adaptiveDecision,
    isExecuting: isModule4Running,
    lastExecuted: module4LastExecuted,
  } = useAdaptiveTrainingPlan({
    autoExecute: true,
    dailyExecution: true,
    onPlanAdjusted: (decision, plan) => {
      console.log('[Quest] Adaptive Engine plan:', plan?.length, 'days');
      if (plan && plan.length === 7 && plan.every(day => day.sessions && day.sessions.length > 0)) {
        setWeekPlan(plan);
      }
    },
    onError: (error) => {
      console.error('[Quest] Adaptive Engine error:', error);
    },
  });

  // Use adjusted plan if available, otherwise fall back to base plan
  // IMPORTANT: Only update if we have a valid plan to prevent content disappearing
  useEffect(() => {
    if (adjustedPlan && adjustedPlan.length === 7 && adjustedPlan.every(day => day.sessions && day.sessions.length > 0)) {
      console.log('[Quest] Applying adjusted plan from useEffect');
      setWeekPlan(adjustedPlan);
    } else if (adjustedPlan) {
      console.error('[Quest] Adjusted plan is invalid, keeping current plan:', adjustedPlan.length, 'days');
    }
  }, [adjustedPlan]);

  const todayTarget = useMemo(() => {
    const todaySession = weekPlan[today];
    const mainSession = todaySession?.sessions[0];

    if (!mainSession || !mainSession.km || mainSession.km === 0) {
      return null;
    }

    return {
      distance: mainSession.km,
      elevation: (mainSession as any)?.elevationGain || (mainSession.notes?.match(/(\d+)m/)?.[1] ? parseInt(mainSession.notes.match(/(\d+)m/)![1]) : undefined),
      terrain: (mainSession.notes?.toLowerCase().includes('trail') ? 'trail' :
                mainSession.notes?.toLowerCase().includes('road') ? 'road' :
                undefined) as 'road' | 'trail' | 'mixed' | undefined,
    };
  }, [weekPlan, today]);

  const handleRouteSelected = (route: DbSavedRoute) => {
    toast(`Selected route: ${route.name}`, 'success');
    setSelectedSession(null);
  };

  useEffect(() => {
    async function loadRaces() {
      const racesList = await listRaces();
      setRaces(racesList);
    }
    loadRaces();
  }, []);

  useEffect(() => {
    async function loadAthleteStats() {
      try {
        const userProfile = await getCurrentUserProfile();
        if (!userProfile) return;

        const settings = await getUserSettings();
        const logEntries = await syncLogEntries();
        const races = load("races", []);

        const profile = buildAthleteProfile(userProfile, logEntries, races);

        const recentWeeklyKm: number[] = [];
        const recentFatigueScores: number[] = [];
        const now = new Date();

        const currentWeekMonday = new Date(now);
        const dayOfWeek = currentWeekMonday.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        currentWeekMonday.setDate(currentWeekMonday.getDate() - daysToMonday);
        currentWeekMonday.setHours(0, 0, 0, 0);

        const currentWeekSunday = new Date(currentWeekMonday);
        currentWeekSunday.setDate(currentWeekSunday.getDate() + 6);
        currentWeekSunday.setHours(23, 59, 59, 999);

        const currentWeekEntries = logEntries.filter(e => {
          const entryDate = new Date(e.dateISO);
          return entryDate >= currentWeekMonday && entryDate <= currentWeekSunday;
        });

        const currentWeekKm = currentWeekEntries.reduce((sum, e) => sum + (e.km || 0), 0);
        const currentWeekVertical = currentWeekEntries.reduce((sum, e) => sum + (e.elevationGain || 0), 0);

        for (let i = 0; i < 8; i++) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);

          const weekEntries = logEntries.filter(e => {
            const entryDate = new Date(e.dateISO);
            return entryDate >= weekStart && entryDate < weekEnd;
          });

          const weeklyKm = weekEntries.reduce((sum, e) => sum + (e.km || 0), 0);
          recentWeeklyKm.unshift(weeklyKm);

          const fatigueValues = weekEntries
            .map(e => e.fatigue)
            .filter(f => f !== undefined && f !== null) as number[];
          if (fatigueValues.length > 0) {
            const avgFatigue = fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length;
            recentFatigueScores.unshift(avgFatigue);
          }
        }

        const readiness = calculateReadiness(profile as AthleteProfile, recentWeeklyKm, recentFatigueScores);

        let readinessState = "unknown";
        if (readiness.overallScore >= 80) readinessState = "excellent";
        else if (readiness.overallScore >= 70) readinessState = "good";
        else if (readiness.overallScore >= 50) readinessState = "fair";
        else readinessState = "poor";

        setAthleteStats({
          readiness: readinessState,
          readinessScore: readiness.overallScore,
          weeklyVolume: currentWeekKm,
          vertical: Math.round(currentWeekVertical),
          units: settings.units,
        });
      } catch (error) {
        console.error("[Quest] Failed to load athlete stats:", error);
      }
    }
    loadAthleteStats();
  }, []);

  useEffect(() => {
    async function loadCurrentWeather() {
      let userLoc = getSavedLocation();
      console.log('[Quest] Saved location:', userLoc);

      // If no saved location, try to detect it
      if (!userLoc) {
        console.log('[Quest] No saved location, detecting...');
        try {
          userLoc = await detectLocation(5000);
          saveLocation(userLoc);
          console.log('[Quest] Location detected and saved:', userLoc);
        } catch (error) {
          console.log('[Quest] Location detection failed, using Chiang Mai default:', error);
          // Default to Chiang Mai if detection fails
          userLoc = { lat: 18.7883, lon: 98.9853, label: 'Chiang Mai, Thailand' };
        }
      } else if (!userLoc.label) {
        // If location exists but has no label, add it
        console.log('[Quest] Updating location with city name...');
        userLoc = await ensureLocationLabel() || userLoc;
      }

      try {
        const weather = await getWeatherForLocation(userLoc.lat, userLoc.lon);
        console.log('[Quest] Loaded weather:', weather);
        setCurrentWeather(weather);
        showImmediateWeatherAlert(weather);
      } catch (error) {
        console.error('[Quest] Failed to load weather:', error);
        setCurrentWeather(null);
      }
    }
    loadCurrentWeather();
  }, []);

  useEffect(() => {
    const handlePlanUpdate = () => {
      const updatedPlan = getWeekPlan();
      // Only update if we get a valid 7-day plan to prevent content disappearing
      if (updatedPlan && updatedPlan.length === 7) {
        console.log('[Quest] Plan updated via event');
        setWeekPlan(updatedPlan);
      } else {
        console.warn('[Quest] Received invalid plan update, ignoring');
      }
    };
    window.addEventListener("plan:updated", handlePlanUpdate);
    window.addEventListener("planner:updated", handlePlanUpdate);

    // Listen for plan adaptations from feedback loop
    const handlePlanAdapted = () => {
      const updatedPlan = getWeekPlan();
      // Only update if we get a valid 7-day plan
      if (updatedPlan && updatedPlan.length === 7) {
        console.log('[Quest] Plan adapted via event');
        setWeekPlan(updatedPlan);
        loadCompletionStatus();
        loadLogEntries(); // Refresh log entries when plan adapts
      } else {
        console.warn('[Quest] Received invalid adapted plan, ignoring');
      }
    };
    window.addEventListener("plan:adapted", handlePlanAdapted);

    // Listen for new log imports
    const handleLogImport = () => {
      console.log('[Quest] Log entries updated - reloading');
      loadLogEntries();
    };
    window.addEventListener("log:import-complete", handleLogImport);

    return () => {
      window.removeEventListener("plan:updated", handlePlanUpdate);
      window.removeEventListener("planner:updated", handlePlanUpdate);
      window.removeEventListener("plan:adapted", handlePlanAdapted);
      window.removeEventListener("log:import-complete", handleLogImport);
    };
  }, []);

  // Load log entries and completion status for the week
  useEffect(() => {
    loadLogEntries();
    loadCompletionStatus();
  }, []);

  const loadLogEntries = async () => {
    try {
      const entries = await getLogEntries(100);
      console.log('[Quest] Loaded log entries:', entries.length);

      // Filter to current week only
      const monday = getMonday();
      const mondayDate = new Date(monday);
      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(sundayDate.getDate() + 6);
      const sunday = sundayDate.toISOString().slice(0, 10);

      const weekEntries = entries.filter(entry => {
        return entry.dateISO >= monday && entry.dateISO <= sunday;
      });

      console.log('[Quest] Week entries:', weekEntries.length, 'from', monday, 'to', sunday);
      weekEntries.forEach(e => console.log('  -', e.dateISO, e.title));

      setWeekLogEntries(weekEntries);
    } catch (error) {
      console.error('Failed to load log entries:', error);
    }
  };

  const loadCompletionStatus = async () => {
    try {
      const monday = getMonday();
      const status = await getCompletionStatusForWeek(monday);
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  useEffect(() => {
    async function loadWeather() {
      try {
        const raw = load<{ lat?: number; lon?: number }>("mizzion:location", {});
        const lat = raw.lat ?? 40.7128;
        const lon = raw.lon ?? -74.006;
        const monday = getMonday();
        const wx = await fetchDailyWeather(lat, lon, monday, 7);
        setWeatherData(wx);
      } catch (err) {
        console.error("Weather fetch failed:", err);
      }
    }
    loadWeather();
  }, []);

  const sessions = useMemo<SessionNode[]>(() => {
    // Ensure we have a valid weekPlan array
    if (!weekPlan || weekPlan.length !== 7) {
      console.warn('[Quest] Invalid weekPlan, using default');
      return [];
    }

    const hasUserPlan = weekPlan.some(day => day.sessions.length > 0);
    const defaultPlan = hasUserPlan ? null : loadWeekPlan();

    return weekPlan.map((day, idx) => {
      const mainSession = day.sessions[0];
      const secondSession = day.sessions[1]; // Check for multiple sessions
      const fallback = defaultPlan ? defaultPlan[idx] : null;

      let title = mainSession?.title || fallback?.title || "Rest";
      const km = mainSession?.km ?? fallback?.km;
      let notes = mainSession?.notes || fallback?.notes || "";
      const explicitType = (mainSession as any)?.type || (fallback as any)?.type;
      let sessionType = detectSessionType(title, notes, explicitType);

      // Check if there's a second session (e.g., strength training)
      const hasStrengthSession = secondSession && ((secondSession as any)?.type === 'strength' || /strength|gym|ME/i.test(secondSession.title || ''));

      let emoji = SESSION_EMOJIS[sessionType] || "🏃";

      // Enrich strength sessions with ME assignment data
      if (sessionType === 'strength') {
        if (meAssignment) {
          title = `ME ${meAssignment.meType.replace('_', ' ').toUpperCase()}`;
          const loadInfo = loadRegulation?.shouldAdjust
            ? ` • Load ${loadRegulation.adjustmentType === 'reduce' ? 'Reduced' : 'Adjusted'}`
            : '';
          notes = `${meAssignment.reason}${loadInfo ? '\n\n' + loadRegulation.reason : ''}${coachingMessage ? '\n\n' + coachingMessage : ''}`;
          emoji = loadRegulation?.shouldAdjust ? "⚠️" : "💪";
        }
        // Ensure strength sessions have no distance/pace
        sessionType = 'strength';
        emoji = emoji || "💪";
      }

      // Use actual duration if available, otherwise estimate
      const durationMin = (mainSession as any)?.durationMin ?? (fallback as any)?.durationMin;
      const duration = durationMin
        ? `${Math.floor(durationMin / 60)}h ${Math.floor(durationMin % 60)}m`.replace(/0h /, '')
        : estimateDuration(km, sessionType);

      const elevation = (mainSession as any)?.elevationGain ?? (fallback as any)?.elevationGain;
      const isToday = idx === today;
      const isAdapted = mainSession?.source === "coach";

      const wx = weatherData[idx];
      const weather = wx
        ? {
            temp: Math.round((wx.tMinC + wx.tMaxC) / 2),
            condition: wx.desc,
            icon: WEATHER_ICONS[wx.icon] || "☁️",
          }
        : undefined;

      const pos = BUBBLE_POSITIONS[idx];

      let zones = "";
      if (/z1|zone 1/i.test(notes)) zones = "Zone 1";
      else if (/z2|zone 2/i.test(notes)) zones = "Zone 2";
      else if (/z3|zone 3/i.test(notes)) zones = "Zone 3";
      else if (/z4|zone 4|threshold/i.test(notes)) zones = "Zone 4";
      else if (/z5|zone 5|vo2/i.test(notes)) zones = "Zone 5";

      let pace = km && km > 0 ? `${(profile.paceBase - 0.5).toFixed(1)} - ${profile.paceBase.toFixed(1)} min/km` : undefined;

      // Override distance and pace for strength sessions
      let finalDistance = km && km > 0 ? `${km}K` : undefined;
      if (sessionType === 'strength') {
        finalDistance = undefined;
        pace = undefined;
      }

      // Check if this workout is completed
      const monday = getMonday();
      const workoutDate = new Date(monday);
      workoutDate.setDate(workoutDate.getDate() + idx);
      const dateStr = workoutDate.toISOString().slice(0, 10);
      const isCompleted = completionStatus[dateStr] || false;

      // Build description with elevation if available
      let description = notes || `${title} session as planned.`;
      if (sessionType === 'strength' && notes) {
        // For strength sessions, use the enriched notes directly
        description = notes;
      } else if (elevation && elevation > 0) {
        description = `${km && km > 0 ? `${km}km` : ''} ${elevation ? `• ${Math.round(elevation)}m↑` : ''} ${duration ? `• ${duration}` : ''}`.trim();
        if (notes && !notes.includes('Est.')) {
          description += ` • ${notes}`;
        }
      }

      // Add strength session info if present
      if (hasStrengthSession && secondSession) {
        const strengthNotes = secondSession.notes || 'ME session';
        description += `\n\n💪 ${secondSession.title || 'Strength Training'}: ${strengthNotes}`;
        if (meAssignment) {
          const meType = meAssignment.meType.replace('_', ' ').toUpperCase();
          description = `${km && km > 0 ? `${km}km` : ''} ${duration ? `• ${duration}` : ''} Morning run\n\n💪 ME ${meType}: ${meAssignment.reason}`;
        }
      }

      return {
        id: day.label.toLowerCase(),
        day: DAYS_SHORT[idx],
        dayFull: DAYS[idx],
        type: title,
        emoji,
        duration,
        distance: finalDistance,
        elevation: elevation && elevation > 0 ? Math.round(elevation) : undefined,
        pace,
        zones,
        description,
        weather,
        completed: isCompleted,
        isToday,
        isAdapted,
        isMESession: sessionType === 'strength',
        x: pos.x,
        y: pos.y,
        size: isToday ? 94 : pos.size,
      };
    });
  }, [weekPlan, weatherData, today, profile, completionStatus]);

  // Generate today's training data for mobile view
  const todayData = useTodayTrainingData(sessions, profile);

  async function addRace() {
    const racesList = await listRaces();
    setRaces(racesList);
  }

  const upcoming = useMemo(() => {
    const now = new Date();
    return races
      .map((r) => {
        const d = new Date(r.dateISO);
        const days = Math.ceil((d.getTime() - now.getTime()) / (24 * 3600 * 1000));
        return { ...r, days };
      })
      .filter((r) => !Number.isNaN(r.days) && r.days >= 0)
      .slice(0, 5);
  }, [races]);

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    setDraggingId(id);
    setDragOffset({ x: offsetX, y: offsetY });
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - container.left - dragOffset.x) / container.width) * 100;
    const y = ((e.clientY - container.top - dragOffset.y) / container.height) * 100;
    setTempPositions((prev) => ({ ...prev, [draggingId]: { x, y } }));

    const targetSession = sessions.find((s) => {
      if (s.id === draggingId) return false;
      const dx = Math.abs(s.x - x);
      const dy = Math.abs(s.y - y);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 15;
    });

    setSwappingWith(targetSession?.id || null);
  };

  const handlePointerUp = () => {
    if (draggingId && swappingWith) {
      console.log("Swapping sessions:", draggingId, swappingWith);
    }
    setDraggingId(null);
    setTempPositions({});
    setSwappingWith(null);
  };

  const handleBubbleClick = (session: SessionNode) => {
    if (draggingId) return;
    setSelectedSession(session);
  };

  const handleListDragStart = (e: React.DragEvent, id: string) => {
    console.log('[Quest] Drag start:', id);
    setDraggedListItem(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleListDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedListItem && draggedListItem !== id) {
      setDragOverListItem(id);
    }
  };

  const handleListDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    console.log('[Quest] Drop:', draggedListItem, '->', targetId);
    if (!draggedListItem || draggedListItem === targetId) {
      setDraggedListItem(null);
      setDragOverListItem(null);
      return;
    }
    console.log("Swapping list items:", draggedListItem, targetId);
    setDraggedListItem(null);
    setDragOverListItem(null);
  };

  const handleListDragEnd = () => {
    console.log('[Quest] Drag end');
    setDraggedListItem(null);
    setDragOverListItem(null);
  };

  // Handle workout completion and trigger feedback modal
  const handleWorkoutComplete = async (session: SessionNode) => {
    // Find log entries for this day
    const monday = getMonday();
    const sessionIdx = DAYS.findIndex(d => d.toLowerCase().startsWith(session.day.toLowerCase()));
    const workoutDate = new Date(monday);
    workoutDate.setDate(workoutDate.getDate() + sessionIdx);
    const dateStr = workoutDate.toISOString().slice(0, 10);

    console.log('[Quest] Checking for workout on', dateStr);
    console.log('[Quest] Available week entries:', weekLogEntries.length);
    weekLogEntries.forEach(e => console.log('  - Entry:', e.dateISO, e.title));

    const todayEntries = weekLogEntries.filter(entry => entry.dateISO === dateStr);
    console.log('[Quest] Matching entries for', dateStr, ':', todayEntries.length);

    if (todayEntries.length === 0) {
      toast('No activity logged for this day. Please log your workout first.', 'warning');
      return;
    }

    // For now, use the first entry (we'll add multi-activity support later)
    const logEntry = todayEntries[0];

    console.log('[Quest] Opening feedback modal for:', logEntry.title);
    console.log('[Quest] Session:', session);
    console.log('[Quest] Log entry:', logEntry);
    console.log('[Quest] Log entry ID:', logEntry.id, 'Type:', typeof logEntry.id);

    // Close the session detail modal first
    setSelectedSession(null);

    // Then open the feedback modal
    setSelectedWorkoutForFeedback({ session, logEntry });
    setFeedbackModalOpen(true);

    console.log('[Quest] Modal state set - should be opening now');
  };

  const handleFeedbackSubmit = async (feedbackData: {
    rpe: number;
    feeling: string;
    painAreas: string[];
    notes: string;
  }) => {
    if (!selectedWorkoutForFeedback) return;

    const { session, logEntry } = selectedWorkoutForFeedback;

    // Calculate date
    const monday = getMonday();
    const sessionIdx = DAYS.findIndex(d => d.toLowerCase().startsWith(session.day.toLowerCase()));
    const workoutDate = new Date(monday);
    workoutDate.setDate(workoutDate.getDate() + sessionIdx);
    const dateStr = workoutDate.toISOString().slice(0, 10);

    try {
      // Validate that log entry has a UUID
      if (!logEntry.id) {
        toast('Log entry is missing an ID. Please re-import your activities.', 'error');
        return;
      }

      console.log('[Quest] Submitting feedback with log entry ID:', logEntry.id);

      // Complete the workout with feedback
      await completeWorkoutWithFeedback(
        {
          workoutDate: dateStr,
          plannedWorkoutId: session.id,
          logEntryId: logEntry.id,
          matchType: 'manual',
          notes: `Workout: ${session.type}`
        },
        {
          date: dateStr,
          logEntryId: logEntry.id,
          rpe: feedbackData.rpe,
          feeling: feedbackData.feeling as any,
          painAreas: feedbackData.painAreas,
          notes: feedbackData.notes
        },
        logEntry
      );

      // Reload completion status
      await loadCompletionStatus();
      await loadLogEntries();

      toast('Feedback saved and plan adapted!', 'success');
    } catch (error) {
      console.error('Failed to complete workout:', error);
      toast('Failed to save feedback', 'error');
    } finally {
      setFeedbackModalOpen(false);
      setSelectedWorkoutForFeedback(null);
    }
  };

  return (
    <div className="quest-container">
      <div className="quest-bg-orbs">
        <div className="quest-orb quest-orb-teal"></div>
        <div className="quest-orb quest-orb-lime"></div>
        <div className="quest-orb quest-orb-coral"></div>
      </div>

      <div className="quest-content">
        <section className="quest-header-card">
          <div className="quest-header-top">
            <div className="quest-header-left">
              <div className="quest-header-icon">
                <Zap size={20} />
              </div>
              <h1 className="quest-header-title">Quest</h1>
            </div>
            <nav className="quest-header-nav">
              <Link to="/calendar" className="quest-nav-btn">
                <Calendar size={14} />
                <span>Calendar</span>
              </Link>
              <Link to="/race-mode" className="quest-nav-btn">
                <Flag size={14} />
                <span>Race</span>
              </Link>
              <Link to="/routes" className="quest-nav-btn">
                <Map size={14} />
                <span>Routes</span>
              </Link>
            </nav>
          </div>
        </section>

        {currentWeather && (
          <div className="quest-weather-wrapper">
            <WeatherAlertBanner weather={currentWeather} />
          </div>
        )}

        <div className="quest-training-section">
          <div className="quest-training-card" style={viewMode === "mobile" ? { padding: 0, overflow: 'hidden' } : {}}>
            <div className="quest-card-header" style={viewMode === "mobile" ? { padding: '24px 24px 0' } : {}}>
              <h2 className="quest-card-title">
                This Week
                {isModule4Running && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: 'rgba(94, 179, 255, 0.7)',
                    fontWeight: 400
                  }}>
                    (Optimizing...)
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="quest-list-btn"
                  onClick={() => {
                    if (confirm('Reset this week\'s plan? This will load the default training template.')) {
                      localStorage.removeItem('weekPlan_current');
                      localStorage.removeItem('userWeekPlan');
                      localStorage.removeItem('planner:week');
                      window.location.reload();
                    }
                  }}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  🔄 Reset Plan
                </button>
                <button
                  className="quest-list-btn"
                  onClick={() => {
                    const modes: Array<"cosmic" | "bubbles" | "list" | "mobile"> = ["cosmic", "bubbles", "list", "mobile"];
                    const currentIndex = modes.indexOf(viewMode);
                    const nextIndex = (currentIndex + 1) % modes.length;
                    setViewMode(modes[nextIndex]);
                  }}
                >
                  {viewMode === "cosmic" ? "🫧 Bubbles" : viewMode === "bubbles" ? "📋 List" : viewMode === "list" ? "📱 Today" : "🌌 Cosmic"}
                </button>
              </div>
            </div>
            {viewMode === "cosmic" ? (
              <>
                <CosmicWeekView
                  weekData={(() => {
                    const defaultPlan = loadWeekPlan();

                    return DAYS.map((dayName, idx) => {
                      const dayData = weekPlan[idx];
                      const userSessions = dayData?.sessions || [];
                      const fallback = defaultPlan[idx];

                      let daySessions: any[] = userSessions.length > 0
                        ? userSessions
                        : [{ title: fallback?.title || 'Rest', km: fallback?.km || 0, notes: fallback?.notes || '', type: fallback?.type || 'rest' }];

                      const fallbackTitle = (fallback?.title || '').toLowerCase();
                      const fallbackHasRunAndStrength = (fallbackTitle.includes('run') || fallbackTitle.includes('easy')) &&
                                                         (fallbackTitle.includes('strength') || fallbackTitle.includes('me session'));

                      if (fallbackHasRunAndStrength) {
                        daySessions = [
                          { title: 'Easy run', km: fallback?.km || 6, type: 'easy', notes: '' },
                          { title: 'Strength', km: 0, notes: 'ME session', type: 'strength' }
                        ];
                      }

                      const allWorkouts = daySessions.map((session: any, sessionIdx: number) => {
                        // Debug: log the raw session data
                        if (daySessions.length > 1) {
                          console.log(`[Quest] Day ${idx} Session ${sessionIdx}:`, {
                            title: session.title,
                            km: session.km,
                            type: session.type,
                            notes: session.notes
                          });
                        }

                        const sessionType = detectSessionType(session.title || '', session.notes, session?.type);

                        // For strength sessions, override display properties
                        const isStrength = sessionType === 'strength';
                        const displayTitle = isStrength && session.title?.toLowerCase().includes('strength')
                          ? 'Strength Training'
                          : session.title || 'Workout';

                        const workout = {
                          id: `${idx}-${sessionIdx}`,
                          type: sessionType as any,
                          title: displayTitle,
                          duration: isStrength
                            ? '40 min'
                            : session?.durationMin
                              ? `${Math.floor(session.durationMin / 60)}h ${Math.floor(session.durationMin % 60)}m`.replace(/0h /, '')
                              : session.km ? estimateDuration(session.km, sessionType) : '30 min',
                          distance: isStrength ? undefined : (session.km ? `${session.km}K` : undefined),
                          completed: completionStatus[idx] || false,
                          isToday: idx === today,
                          elevation: session?.elevationGain,
                          zones: session?.zones,
                        };

                        if (daySessions.length > 1) {
                          console.log(`[Quest] -> Workout ${sessionIdx}:`, workout);
                        }

                        return workout;
                      });

                      return {
                        day: dayName,
                        dayShort: DAYS_SHORT[idx],
                        workouts: allWorkouts,
                        isToday: idx === today,
                      };
                    });
                  })()}
                  onWorkoutClick={(workout, day) => {
                    const dayIndex = DAYS.indexOf(day);
                    const baseSession = sessions[dayIndex];

                    if (workout.type === 'strength' && meAssignment && meTemplates.length > 0) {
                      const strengthSession: SessionNode = {
                        ...baseSession,
                        id: `strength-${dayIndex}`,
                        type: 'Strength Training',
                        emoji: String.fromCodePoint(0x1F4AA),
                        description: 'ME session - terrain-based strength work',
                        isMESession: true,
                        distance: undefined,
                        pace: undefined,
                      };
                      setSelectedSession(strengthSession);
                    } else if (baseSession) {
                      setSelectedSession(baseSession);
                    }
                  }}
                  onAddClick={() => {
                    console.log('[Quest] Add workout clicked');
                  }}
                />
              </>
            ) : viewMode === "mobile" ? (
              <>
                {/* NEW: Mobile Training View */}
                {todayData ? (
                  <div style={{ padding: '16px' }}>
                    <TodayTrainingMobile
                      data={{
                        type: todayData.summary.title,
                        duration: todayData.summary.duration,
                        distance: todayData.summary.distance,
                        pace: todayData.summary.pace,
                        isToday: true,
                        isAdapted: false
                      }}
                      onComplete={() => {
                        const todaySession = sessions.find(s => s.isToday);
                        if (todaySession) {
                          const monday = getMonday();
                          const workoutDate = new Date(monday);
                          workoutDate.setDate(workoutDate.getDate() + sessions.indexOf(todaySession));
                          setSelectedWorkoutForFeedback({
                            date: workoutDate.toISOString().slice(0, 10),
                            title: todaySession.type,
                            type: detectSessionType(todaySession.type),
                            distanceKm: parseFloat(todaySession.distance?.replace('K', '') || '0'),
                            durationMinutes: parseInt(todaySession.duration.match(/\d+/)?.[0] || '0', 10)
                          });
                          setFeedbackModalOpen(true);
                        }
                      }}
                      onEdit={() => {
                        const todaySession = sessions.find(s => s.isToday);
                        if (todaySession) setSelectedSession(todaySession);
                      }}
                    />

                    {/* Core Training Session (if scheduled for today) */}
                    {selectedCoreSession.length > 0 && coreEmphasis && coreFrequency.frequency > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <CoreSessionCard
                          exercises={selectedCoreSession}
                          emphasis={coreEmphasis}
                          frequency={coreFrequency}
                          sessionsThisWeek={0}
                          sorenessAdjustment={sorenessAdjustment}
                          onComplete={() => {
                            toast('Core session completed!', 'success');
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
                    No training session scheduled for today
                  </div>
                )}
              </>
            ) : viewMode === "bubbles" ? (
              <>
                <p className="quest-instruction-text">💡 Tap sessions for details • Drag to reorder</p>
                {swappingWith && (
                  <div className="quest-swap-indicator">
                    <span className="quest-swap-text">✨ Swapping sessions...</span>
                  </div>
                )}
                <div
                  ref={containerRef}
                  className="quest-bubble-container"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  {sessions.map((session) => (
                    <div key={`label-${session.id}`} style={{ position: "absolute", left: `${session.x}%`, top: `${session.y}%` }}>
                      <div className={`quest-day-label ${session.x > 50 ? "quest-day-right" : "quest-day-left"}`}>
                        {session.day}
                      </div>
                    </div>
                  ))}
                  {sessions.map((session) => {
                    const pos = tempPositions[session.id] || { x: session.x, y: session.y };
                    const isDragging = draggingId === session.id;
                    const isSwapTarget = swappingWith === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`quest-bubble ${session.completed ? "quest-bubble-completed" : ""} ${
                          session.isToday ? "quest-bubble-today" : ""
                        } ${!session.completed && !session.isToday ? "quest-bubble-upcoming" : ""} ${
                          isDragging ? "quest-bubble-dragging" : ""
                        } ${isSwapTarget ? "quest-bubble-swap-target" : ""}`}
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          width: `${session.size}px`,
                          height: `${session.size}px`,
                          cursor: isDragging ? "grabbing" : "grab",
                        }}
                        onPointerDown={(e) => handlePointerDown(e, session.id)}
                        onClick={() => handleBubbleClick(session)}
                      >
                        <div className="quest-bubble-content">
                          <div className="quest-bubble-emoji">{session.emoji}</div>
                          <div className="quest-bubble-type">{session.type}</div>
                          <div className="quest-bubble-duration">{session.duration}</div>
                          {session.weather && (
                            <div className="quest-bubble-weather">
                              {session.weather.icon} {session.weather.temp}°
                            </div>
                          )}
                        </div>
                        {session.completed && <div className="quest-bubble-badge quest-bubble-check">✓</div>}
                        {session.isToday && <div className="quest-bubble-badge quest-bubble-now">NOW</div>}
                        {session.isAdapted && <div className="quest-bubble-badge quest-bubble-ai">AI</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="quest-list-view">
                <p className="quest-instruction-text" style={{ marginBottom: '12px' }}>💡 Drag sessions to reorder</p>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`quest-list-item ${session.completed ? "quest-list-completed" : ""} ${
                      session.isToday ? "quest-list-today" : ""
                    } ${draggedListItem === session.id ? "quest-list-dragging" : ""} ${
                      dragOverListItem === session.id ? "quest-list-drag-over" : ""
                    }`}
                    onDragOver={(e) => handleListDragOver(e, session.id)}
                    onDrop={(e) => handleListDrop(e, session.id)}
                    onDragEnd={handleListDragEnd}
                    onClick={() => !draggedListItem && setSelectedSession(session)}
                  >
                    <div
                      className="quest-list-drag-handle"
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleListDragStart(e, session.id);
                      }}
                    >⋮⋮</div>
                    <div className="quest-list-icon">{session.emoji}</div>
                    <div className="quest-list-content">
                      <div className="quest-list-header">
                        <span className="quest-list-day">{session.dayFull}</span>
                        {session.isToday && <span className="quest-list-now-badge">NOW</span>}
                        {session.isAdapted && <span className="quest-list-ai-badge">AI</span>}
                      </div>
                      <div className="quest-list-title">{session.type}</div>
                      <div className="quest-list-details">
                        <span>{session.duration}</span>
                        {session.distance && (
                          <>
                            <span className="quest-list-separator">•</span>
                            <span>{session.distance}</span>
                          </>
                        )}
                        {session.pace && (
                          <>
                            <span className="quest-list-separator">•</span>
                            <span>{session.pace}</span>
                          </>
                        )}
                      </div>
                      {session.isAdapted && <div className="quest-list-adapted-note">Adapted by AI Coach</div>}
                    </div>
                    <div className="quest-list-right">
                      {session.weather && (
                        <div className="quest-list-weather">
                          <span className="quest-list-weather-icon">{session.weather.icon}</span>
                          <span className="quest-list-weather-temp">{session.weather.temp}°</span>
                        </div>
                      )}
                      {session.zones && <div className="quest-list-zones">{session.zones}</div>}
                    </div>
                    {session.completed && <div className="quest-list-check">✓</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {athleteStats && (
          <div className="quest-stats-row">
            <div className="quest-stat-item">
              <div className="quest-stat-icon">
                <Activity size={14} />
              </div>
              <div className="quest-stat-content">
                <span className="quest-stat-label">Readiness</span>
                <span className={`quest-stat-value quest-stat-${athleteStats.readiness}`}>
                  {athleteStats.readiness}
                </span>
              </div>
            </div>
            <div className="quest-stat-item">
              <div className="quest-stat-icon">
                <TrendingUp size={14} />
              </div>
              <div className="quest-stat-content">
                <span className="quest-stat-label">Weekly</span>
                <span className="quest-stat-value">
                  {athleteStats.weeklyVolume.toFixed(0)}
                  <span className="quest-stat-unit">{athleteStats.units === 'metric' ? 'km' : 'mi'}</span>
                </span>
              </div>
            </div>
            <div className="quest-stat-item">
              <div className="quest-stat-icon">
                <Mountain size={14} />
              </div>
              <div className="quest-stat-content">
                <span className="quest-stat-label">Vertical</span>
                <span className="quest-stat-value">
                  {athleteStats.vertical}
                  <span className="quest-stat-unit">m</span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="quest-races-container">
          {upcoming.map((race) => (
            <div key={race.id} className="quest-race-item">
              <div className="quest-race-left">
                <div className="quest-race-name-row">
                  <span className="quest-race-trophy">🏆</span>
                  <span className="quest-race-name">{race.name}</span>
                  {race.priority === 'A' && <span className="quest-race-goal-badge">GOAL</span>}
                </div>
                <div className="quest-race-details-row">
                  {race.distanceKm && `${race.distanceKm}K`}
                  {race.distanceKm && race.location && " • "}
                  {race.location}
                  {race.priority && ` • Priority ${race.priority}`}
                </div>
              </div>
              <div className="quest-race-right">{race.days} days</div>
            </div>
          ))}
        </div>

        <div className="quest-quick-links">
          <Link to="/environmental" className="quest-quick-link">
            <Thermometer size={16} />
            <span>Climate</span>
            <ChevronRight size={14} />
          </Link>
          <Link to="/unity" className="quest-quick-link">
            <Users size={16} />
            <span>Community</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {selectedSession && (
        <div className="quest-session-modal-backdrop" onClick={() => { setSelectedSession(null); setLiveWorkoutMode(false); }}>
          <div className="quest-session-modal" onClick={(e) => e.stopPropagation()}>
            <button className="quest-session-modal-close" onClick={() => { setSelectedSession(null); setLiveWorkoutMode(false); }}>
              ✕
            </button>

            {/* ME Session with Live Workout Tracker */}
            {selectedSession.isMESession ? (
              (() => {
                const defaultTemplate = meTemplates[0] || {
                  id: 'default-me',
                  name: 'Strength Training',
                  workoutNumber: 1,
                  meType: 'gym_based' as const,
                  meCategory: 'gym_lower',
                  durationMinutes: 40,
                  description: 'ME session - terrain-based strength work',
                  exercises: [
                    { name: 'Bulgarian Split Squat', sets: 3, reps: '8-10', load: 'bodyweight or light', notes: 'Focus on controlled descent, knee tracking over toe' },
                    { name: 'Romanian Deadlift', sets: 3, reps: '10-12', load: 'moderate', notes: 'Hinge at hips, slight knee bend, feel hamstring stretch' },
                    { name: 'Step-ups', sets: 3, reps: '10 each leg', load: 'bodyweight or weighted', notes: 'Drive through heel, full extension at top' },
                    { name: 'Calf Raises', sets: 3, reps: '15-20', load: 'bodyweight', notes: 'Slow eccentric, pause at bottom' },
                    { name: 'Plank', sets: 3, reps: '45-60s', load: 'bodyweight', notes: 'Keep core engaged, avoid sagging' },
                  ],
                  restProtocol: { between_sets_seconds: 60, between_exercises_seconds: 90 },
                };
                return liveWorkoutMode && userId ? (
                  <div style={{
                    width: '100%',
                    maxWidth: '480px',
                    margin: '0 auto',
                    height: 'calc(100vh - 80px)',
                  }}>
                    <LiveWorkoutTracker
                      template={defaultTemplate}
                      userId={userId}
                      onComplete={() => {
                        setLiveWorkoutMode(false);
                        setSelectedSession(null);
                        handleWorkoutComplete(selectedSession);
                        toast('Strength session completed!', 'success');
                      }}
                      onClose={() => setLiveWorkoutMode(false)}
                    />
                  </div>
                ) : (
                  <div style={{
                    maxWidth: '480px',
                    margin: '0 auto',
                    maxHeight: 'calc(100vh - 80px)',
                    overflowY: 'auto',
                    padding: '16px'
                  }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>{selectedSession.dayFull}</div>
                      {selectedSession.isToday && (
                        <span style={{
                          padding: '2px 8px',
                          background: 'var(--success)',
                          color: 'white',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          marginLeft: 8
                        }}>
                          TODAY
                        </span>
                      )}
                    </div>
                    <MESessionInline
                      template={defaultTemplate}
                      targetedWeakness={coachingMessage}
                      loadRegulation={loadRegulation}
                    />
                    {selectedSession.weather && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: 8,
                        marginTop: 12
                      }}>
                        <span>{selectedSession.weather.icon}</span>
                        <span style={{ fontSize: 13 }}>{selectedSession.weather.temp}° • {selectedSession.weather.condition}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button
                        onClick={() => setLiveWorkoutMode(true)}
                        style={{
                          flex: 1,
                          padding: '14px',
                          background: '#fbbf24',
                          border: 'none',
                          borderRadius: 8,
                          color: '#000',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Start Workout
                      </button>
                      <button
                        onClick={() => { setSelectedSession(null); setLiveWorkoutMode(false); }}
                        style={{
                          padding: '14px 20px',
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 8,
                        color: '#fff',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
              })()
            ) : selectedSession.isToday && todayData ? (
              <div style={{
                maxWidth: '448px',
                margin: '0 auto',
                maxHeight: 'calc(100vh - 80px)',
                overflowY: 'auto',
                padding: '16px'
              }}>
                <TodayTrainingMobile
                  data={{
                    type: todayData.summary.title,
                    duration: todayData.summary.duration,
                    distance: todayData.summary.distance,
                    pace: todayData.summary.pace,
                    isToday: true,
                    isAdapted: false
                  }}
                  onComplete={() => handleWorkoutComplete(selectedSession)}
                  onEdit={() => {
                    setSelectedSession(null);
                  }}
                />

                {/* Core Training Session (if scheduled for today) */}
                {selectedCoreSession.length > 0 && coreEmphasis && coreFrequency.frequency > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <CoreSessionCard
                      exercises={selectedCoreSession}
                      emphasis={coreEmphasis}
                      frequency={coreFrequency}
                      sessionsThisWeek={0}
                      sorenessAdjustment={sorenessAdjustment}
                      onComplete={() => {
                        toast('Core session completed!', 'success');
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Original modal for non-today sessions */
              <>
                <div className="quest-session-modal-header">
                  <div className="quest-session-modal-icon">{selectedSession.emoji}</div>
                  <div className="quest-session-modal-title-section">
                    <div className="quest-session-modal-day">{selectedSession.dayFull}</div>
                    <h3 className="quest-session-modal-title">{selectedSession.type}</h3>
                  </div>
                  {selectedSession.isToday && <div className="quest-session-modal-now-badge">NOW</div>}
                  {selectedSession.isAdapted && <div className="quest-session-modal-ai-badge">AI</div>}
                </div>
                <div className="quest-session-modal-body">
                  <div className="quest-session-modal-stats">
                    <div className="quest-session-modal-stat">
                      <div className="quest-session-modal-stat-label">Duration</div>
                      <div className="quest-session-modal-stat-value">{selectedSession.duration}</div>
                    </div>
                    {selectedSession.distance && (
                      <div className="quest-session-modal-stat">
                        <div className="quest-session-modal-stat-label">Distance</div>
                        <div className="quest-session-modal-stat-value">{selectedSession.distance}</div>
                      </div>
                    )}
                    {selectedSession.pace && (
                      <div className="quest-session-modal-stat">
                        <div className="quest-session-modal-stat-label">Pace</div>
                        <div className="quest-session-modal-stat-value">{selectedSession.pace}</div>
                      </div>
                    )}
                    {selectedSession.zones && (
                      <div className="quest-session-modal-stat">
                        <div className="quest-session-modal-stat-label">Zones</div>
                        <div className="quest-session-modal-stat-value">{selectedSession.zones}</div>
                      </div>
                    )}
                  </div>
                  {selectedSession.weather && (
                    <div className="quest-session-modal-weather">
                      <span className="quest-session-modal-weather-icon">{selectedSession.weather.icon}</span>
                      <span className="quest-session-modal-weather-text">
                        {selectedSession.weather.temp}° • {selectedSession.weather.condition}
                      </span>
                    </div>
                  )}
                  {selectedSession.description && (
                    <div className="quest-session-modal-description">
                      <div className="quest-session-modal-description-label">Instructions</div>
                      <p>{selectedSession.description}</p>
                    </div>
                  )}
                  <div className="quest-session-modal-actions">
                    {!selectedSession.completed ? (
                      <>
                        <button
                          className="quest-session-modal-btn quest-session-modal-btn-primary"
                          onClick={() => handleWorkoutComplete(selectedSession)}
                        >
                          Complete & Feedback
                        </button>
                        <button className="quest-session-modal-btn quest-session-modal-btn-secondary">Edit</button>
                      </>
                    ) : (
                      <div style={{
                        padding: '12px',
                        background: 'var(--success)',
                        color: 'white',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        Completed - Feedback submitted
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <QuickAddRace open={openQuick} onClose={() => setOpenQuick(false)} onAdded={addRace} />

      {/* Workout Feedback Modal */}
      <PostWorkoutFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => {
          setFeedbackModalOpen(false);
          setSelectedWorkoutForFeedback(null);
        }}
        workoutTitle={selectedWorkoutForFeedback?.session.type || ''}
        actualDuration={selectedWorkoutForFeedback?.logEntry.durationMin}
        onSubmit={handleFeedbackSubmit}
      />
    </div>
  );
}
