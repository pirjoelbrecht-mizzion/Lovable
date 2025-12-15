import { useState, useEffect, useMemo } from "react";
import { useT } from "@/i18n";
import { load } from "@/utils/storage";
import type { LogEntry } from "@/types";
import { syncLogEntries } from "@/lib/database";
import { getActivePriorityRace } from "@/utils/races";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { getUserSettings } from "@/lib/userSettings";
import { supabase } from "@/lib/supabase";
import {
  buildAthleteProfile,
  convertRaceToEvent,
  classifyAthlete,
  calculateReadiness,
  generateMacrocycle,
  generateMicrocycle,
  checkWeeklyPlanSafety,
  analyzeFeedbackSignals,
  makeAdaptationDecision,
  getRaceRequirements,
  explainWeeklyPlan,
  type AthleteProfile,
  type RaceEvent,
  type WeeklyPlan,
  type DailyFeedback,
  type SafetyCheckResult,
  type MicrocycleInput,
} from "@/lib/adaptive-coach";
import { useAdaptiveTrainingPlan } from "@/hooks/useAdaptiveTrainingPlan";
import { detectTrainingMode, getMaintenanceVolume } from "@/services/trainingModeDetection";
import { generateMaintenancePlan } from "@/lib/adaptive-coach/maintenancePlanGenerator";

interface AdaptiveCoachPanelProps {
  onPlanGenerated?: (plan: WeeklyPlan) => void;
}

export default function AdaptiveCoachPanel({ onPlanGenerated }: AdaptiveCoachPanelProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [athleteProfile, setAthleteProfile] = useState<Partial<AthleteProfile> | null>(null);
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheckResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Module 4: Adaptive Decision Engine integration
  const {
    execute: executeModule4,
    decision: module4Decision,
    isExecuting: isModule4Running,
  } = useAdaptiveTrainingPlan({
    autoExecute: false, // Manual execution only from this panel
    dailyExecution: false,
  });

  useEffect(() => {
    loadAthleteData();
  }, []);

  async function loadAthleteData() {
    try {
      setLoading(true);
      const userProfile = await getCurrentUserProfile();

      if (!userProfile) {
        setExplanation("Please complete your profile in Settings to use the Adaptive Coach.");
        return;
      }

      const logEntries = await syncLogEntries();
      const races = load("races", []);

      const profile = buildAthleteProfile(userProfile, logEntries, races);
      const classification = classifyAthlete(profile as AthleteProfile);

      // Calculate recent weekly volumes and fatigue scores
      const recentWeeklyKm: number[] = [];
      const recentFatigueScores: number[] = [];

      // Get last 8 weeks of data
      const now = new Date();
      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekEntries = logEntries.filter(e => {
          const entryDate = new Date(e.dateISO); // CRITICAL FIX: Use dateISO not date
          return entryDate >= weekStart && entryDate < weekEnd;
        });

        const weeklyKm = weekEntries.reduce((sum, e) => sum + (e.km || 0), 0);
        recentWeeklyKm.unshift(weeklyKm);

        // Calculate average fatigue for the week if available
        const fatigueValues = weekEntries
          .map(e => e.fatigue)
          .filter(f => f !== undefined && f !== null) as number[];
        if (fatigueValues.length > 0) {
          const avgFatigue = fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length;
          recentFatigueScores.unshift(avgFatigue);
        }
      }

      const readiness = calculateReadiness(profile as AthleteProfile, recentWeeklyKm, recentFatigueScores);

      // Convert readiness score to state label
      let readinessState = "unknown";
      if (readiness.overallScore >= 80) {
        readinessState = "excellent";
      } else if (readiness.overallScore >= 70) {
        readinessState = "good";
      } else if (readiness.overallScore >= 50) {
        readinessState = "fair";
      } else {
        readinessState = "poor";
      }

      setAthleteProfile({
        ...profile,
        category: classification.category,
        readiness: readinessState,
        readinessScore: readiness.overallScore,
      });
    } catch (error) {
      console.error("[AdaptiveCoach] Failed to load athlete data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateAdaptivePlan() {
    if (!athleteProfile) return;

    try {
      setLoading(true);
      const logEntries = await syncLogEntries();
      const raceResult = await getActivePriorityRace();

      // Handle no-race scenario: Generate maintenance plan
      if (!raceResult.race) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const targetVolume = await getMaintenanceVolume(user.id);
          const maintenancePlan = generateMaintenancePlan({
            athlete: athleteProfile as AthleteProfile,
            targetWeeklyVolume: targetVolume,
            includeWorkouts: true,
            preferLongRunDay: 'sunday',
          });

          setCurrentPlan(maintenancePlan.plan);
          setExplanation(maintenancePlan.explanation);

          // Generate safety check
          const safety = checkWeeklyPlanSafety(
            maintenancePlan.plan,
            athleteProfile as AthleteProfile,
            athleteProfile.averageMileage
          );
          setSafetyCheck(safety);

          if (onPlanGenerated) {
            onPlanGenerated(maintenancePlan.plan);
          }
        } else {
          setExplanation("Maintenance mode: Training without a race goal. Set a race in the Calendar to switch to race-focused training.");
        }

        return;
      }

      const race = raceResult.race;
      const raceEvent = convertRaceToEvent(race);

      // Calculate weeks to race
      const raceDate = new Date(race.dateISO); // CRITICAL FIX: Use dateISO not date
      const today = new Date();
      const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const weeksToRace = Math.max(1, Math.ceil(daysToRace / 7));

      const macrocycle = generateMacrocycle({
        athlete: athleteProfile as AthleteProfile,
        race: raceEvent
      });

      const currentWeek = 1;
      const macrocycleWeek = macrocycle.weeks[0];

      const microcycleInput: MicrocycleInput = {
        weekNumber: currentWeek,
        macrocycleWeek,
        athlete: athleteProfile as AthleteProfile,
        race: raceEvent,
        isRecoveryWeek: false,
        previousWeekMileage: athleteProfile.averageMileage
      };

      const weeklyPlan = generateMicrocycle(microcycleInput);

      const safety = checkWeeklyPlanSafety(
        weeklyPlan,
        athleteProfile as AthleteProfile,
        athleteProfile.averageMileage
      );

      setSafetyCheck(safety);

      // Generate explanation (before Module 4)
      let planExplanation = null;
      if (!safety.passed) {
        setExplanation(
          `⚠️ Safety Check Failed:\n\n${safety.violations.map(v => `• ${v.message}`).join('\n')}\n\nPlan adjusted to safe levels.`
        );
      } else {
        planExplanation = explainWeeklyPlan(
          weeklyPlan,
          athleteProfile as AthleteProfile,
          raceEvent,
          weeksToRace
        );

        // Format CoachingMessage as string
        let formattedExplanation = `📋 ${planExplanation.title}\n\n${planExplanation.body}`;

        if (planExplanation.actionItems && planExplanation.actionItems.length > 0) {
          formattedExplanation += `\n\n✓ Action Items:\n${planExplanation.actionItems.map(item => `  • ${item}`).join('\n')}`;
        }

        setExplanation(formattedExplanation);
      }

      setCurrentPlan(weeklyPlan);

      // Module 4: Apply adaptive intelligence adjustments
      console.log('[AdaptiveCoachPanel] Applying Module 4 adjustments to base plan...');
      setExplanation('🧠 Module 4 Adjusting...');

      // Small delay to ensure loading message is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        const adjustedDecision = await executeModule4(weeklyPlan);

        if (adjustedDecision) {
          const adjustedPlan = adjustedDecision.modifiedPlan || weeklyPlan;
          setCurrentPlan(adjustedPlan);

          // Build comprehensive explanation
          let fullExplanation = planExplanation
            ? `📋 ${planExplanation.title}\n\n${planExplanation.body}`
            : '📋 Weekly Training Plan';

          // Check if adjustmentLayers exists and has applied changes
          if (adjustedDecision.adjustmentLayers && Array.isArray(adjustedDecision.adjustmentLayers)) {
            const appliedLayers = adjustedDecision.adjustmentLayers.filter(layer => layer.applied);

            if (appliedLayers.length > 0) {
              fullExplanation += '\n\n🔧 Module 4 Adaptive Adjustments Applied:\n';
              appliedLayers.forEach(layer => {
                const changeCount = layer.changes?.length || 0;
                fullExplanation += `\n• ${layer.name}: ${changeCount} modification(s)`;
              });

              // Add reasoning if available
              if (adjustedDecision.finalReasoning && Array.isArray(adjustedDecision.finalReasoning)) {
                fullExplanation += `\n\n💡 Reasoning:\n${adjustedDecision.finalReasoning.join('\n')}`;
              }
            }
          }

          if (planExplanation?.actionItems && planExplanation.actionItems.length > 0) {
            fullExplanation += `\n\n✓ Action Items:\n${planExplanation.actionItems.map(item => `  • ${item}`).join('\n')}`;
          }

          setExplanation(fullExplanation);

          if (onPlanGenerated) {
            onPlanGenerated(adjustedPlan);
          }
        } else {
          // Module 4 failed, use base plan
          if (onPlanGenerated) {
            onPlanGenerated(weeklyPlan);
          }
        }
      } catch (module4Error) {
        console.error('[AdaptiveCoachPanel] Module 4 execution failed, using base plan:', module4Error);
        // Fall back to base plan
        if (onPlanGenerated) {
          onPlanGenerated(weeklyPlan);
        }
      }
    } catch (error) {
      console.error("[AdaptiveCoach] Failed to generate plan:", error);
      setExplanation(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function adaptPlanBasedOnFeedback(feedback: DailyFeedback) {
    if (!currentPlan || !athleteProfile) return;

    try {
      setLoading(true);
      const signals = analyzeFeedbackSignals([feedback]);
      const decision = makeAdaptationDecision(
        signals,
        currentPlan,
        athleteProfile as AthleteProfile
      );

      if (decision.shouldAdapt) {
        setExplanation(
          `🔄 Plan Adapted:\n\n${decision.reasoning}\n\nAdjustments:\n${decision.adaptations.map(a => `• ${a}`).join('\n')}`
        );
      }
    } catch (error) {
      console.error("[AdaptiveCoach] Failed to adapt plan:", error);
    } finally {
      setLoading(false);
    }
  }

  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  useEffect(() => {
    getUserSettings().then(settings => {
      setUnits(settings.units);
    });
  }, []);

  const distanceLabel = units === 'metric' ? 'Avg Weekly Distance' : 'Avg Weekly Mileage';
  const distanceUnit = units === 'metric' ? 'km' : 'mi';

  const averageVertical = useMemo(() => {
    if (!athleteProfile?.averageVertical) return 0;
    return Math.round(athleteProfile.averageVertical);
  }, [athleteProfile]);

  const readinessColor = useMemo(() => {
    if (!athleteProfile?.readiness) return "#666";
    switch (athleteProfile.readiness) {
      case "optimal": return "#22c55e";
      case "good": return "#06b6d4";
      case "moderate": return "#f59e0b";
      case "low": return "#f97316";
      case "poor": return "#ef4444";
      default: return "#666";
    }
  }, [athleteProfile]);

  if (loading && !athleteProfile) {
    return (
      <div className="card" style={{
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        position: "relative",
        zIndex: 1,
        pointerEvents: "auto"
      }}>
        <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>🧠 Loading Adaptive Coach...</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Analyzing your training profile</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      position: "relative",
      zIndex: 1,
      pointerEvents: "auto"
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#fff" }}>
          🧠 Adaptive Ultra Training Coach
        </h3>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
          AI-powered coaching for race-focused training and maintenance mode
        </div>
        {!athleteProfile && !loading && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: 6,
            border: "1px solid rgba(239, 68, 68, 0.3)",
            fontSize: 13,
            color: "#fca5a5"
          }}>
            ⚠️ Unable to load athlete profile. Please complete onboarding in Settings.
          </div>
        )}
      </div>

      {athleteProfile && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16
        }}>
          <div style={{
            padding: 12,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Avg Weekly Vertical</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
              {averageVertical} m
            </div>
          </div>

          <div style={{
            padding: 12,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Readiness</div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: readinessColor,
              textTransform: "capitalize"
            }}>
              {athleteProfile.readiness || "Unknown"}
            </div>
          </div>

          <div style={{
            padding: 12,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{distanceLabel}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
              {athleteProfile.averageMileage?.toFixed(1) || "0"} {distanceUnit}
            </div>
          </div>

          <div style={{
            padding: 12,
            background: "rgba(255,255,255,0.05)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)"
          }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Consistency</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>
              {athleteProfile.trainingConsistency || 0}%
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, position: "relative", zIndex: 2 }}>
        <button
          className="btn primary"
          onClick={generateAdaptivePlan}
          disabled={loading || isModule4Running || !athleteProfile}
          style={{ flex: 1, cursor: loading || isModule4Running || !athleteProfile ? "not-allowed" : "pointer", pointerEvents: "auto" }}
        >
          {loading || isModule4Running ? (isModule4Running ? "🧠 Module 4 Adjusting..." : "Generating...") : "🎯 Generate Adaptive Plan"}
        </button>

        <button
          className="btn"
          onClick={() => setShowDetails(!showDetails)}
          disabled={!currentPlan}
          style={{ cursor: !currentPlan ? "not-allowed" : "pointer", pointerEvents: "auto" }}
        >
          {showDetails ? "Hide" : "Details"}
        </button>
      </div>

      {explanation && (
        <div style={{
          padding: 16,
          background: "rgba(59, 130, 246, 0.1)",
          borderRadius: 8,
          border: "1px solid rgba(59, 130, 246, 0.3)",
          marginBottom: 16
        }}>
          <div style={{ fontSize: 13, color: "#93c5fd", whiteSpace: "pre-line", lineHeight: 1.6 }}>
            {explanation}
          </div>
        </div>
      )}

      {safetyCheck && !safetyCheck.passed && (
        <div style={{
          padding: 12,
          background: "rgba(239, 68, 68, 0.1)",
          borderRadius: 8,
          border: "1px solid rgba(239, 68, 68, 0.3)",
          marginBottom: 16
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#fca5a5", marginBottom: 8 }}>
            ⚠️ Safety Adjustments Applied
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#fca5a5", fontSize: 12 }}>
            {safetyCheck.violations.map((v, i) => (
              <li key={i}>{v.message}</li>
            ))}
          </ul>
        </div>
      )}

      {showDetails && currentPlan && (
        <div style={{
          padding: 16,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#fff" }}>
            Weekly Plan Details
          </h4>
          <div style={{ display: "grid", gap: 8 }}>
            {currentPlan.days.map((day, i) => (
              <div key={i} style={{
                padding: 10,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 6,
                fontSize: 12
              }}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                  {day.day}: {day.workout.title || day.workout.type}
                </div>
                <div style={{ color: "#94a3b8" }}>
                  {day.workout.type === 'rest' ? (
                    'Rest'
                  ) : (
                    <>
                      {day.workout.distanceKm && `${day.workout.distanceKm.toFixed(1)} km`}
                      {day.workout.distanceKm && day.workout.durationMin && ' • '}
                      {day.workout.durationMin && `${day.workout.durationMin} min`}
                      {day.workout.verticalGain && day.workout.verticalGain > 0 && ` • ${Math.round(day.workout.verticalGain)}m vert`}
                      {day.workout.intensityZones && day.workout.intensityZones.length > 0 &&
                        ` • ${day.workout.intensityZones.join(', ')}`}
                    </>
                  )}
                </div>
                {day.workout.description && (
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                    {day.workout.description}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: 12 }}>
              <div>
                <div style={{ color: "#94a3b8", marginBottom: 4 }}>Total Volume</div>
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  {(currentPlan.actualMileage || currentPlan.targetMileage)?.toFixed(1) || "0"} km
                </div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", marginBottom: 4 }}>Target Time</div>
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  {currentPlan.targetTime ? `${currentPlan.targetTime} min` : "—"}
                </div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", marginBottom: 4 }}>Vertical Gain</div>
                <div style={{ color: "#fff", fontWeight: 600 }}>
                  {(currentPlan.actualVert || currentPlan.targetVert)?.toFixed(0) || "0"} m
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid rgba(255,255,255,0.1)",
        fontSize: 11,
        color: "#64748b"
      }}>
        <strong style={{ color: "#94a3b8" }}>Active Modules:</strong> Athlete Profiler • Macrocycle Planner •
        Workout Library • Microcycle Generator • Safety System • Adaptive Controller •
        Race-Specific Logic • Feedback Processing • Explanation Engine • ACWR Monitoring
      </div>
    </div>
  );
}
