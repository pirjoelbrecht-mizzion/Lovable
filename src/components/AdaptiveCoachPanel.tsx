import { useState, useEffect, useMemo } from "react";
import { useT } from "@/i18n";
import { load } from "@/utils/storage";
import { syncLogEntries } from "@/lib/database";
import { getActivePriorityRace } from "@/utils/races";
import { getCurrentUserProfile } from "@/lib/userProfile";
import { getUserSettings } from "@/lib/userSettings";
import {
  buildAthleteProfile,
  calculateReadiness,
  type AthleteProfile,
} from "@/lib/adaptive-coach";
import { useAdaptiveTrainingPlan } from "@/hooks/useAdaptiveTrainingPlan";
import { detectTrainingMode } from "@/services/trainingModeDetection";
import { RefreshCw, Clock, Activity, Mountain, TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react";

interface AdaptiveCoachPanelProps {
  onPlanGenerated?: (plan: any) => void;
}

export default function AdaptiveCoachPanel({ onPlanGenerated }: AdaptiveCoachPanelProps) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [athleteProfile, setAthleteProfile] = useState<Partial<AthleteProfile> | null>(null);
  const [trainingPhase, setTrainingPhase] = useState<string>("base");
  const [showDetails, setShowDetails] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  const {
    adjustedPlan,
    decision,
    isExecuting,
    lastExecuted,
    error,
    refresh,
  } = useAdaptiveTrainingPlan({
    autoExecute: true,
    dailyExecution: true,
    onPlanAdjusted: (decision, plan) => {
      if (onPlanGenerated) {
        onPlanGenerated(plan);
      }
    },
  });

  useEffect(() => {
    loadAthleteData();
  }, []);

  useEffect(() => {
    getUserSettings().then(settings => {
      setUnits(settings.units);
    });
  }, []);

  async function loadAthleteData() {
    try {
      setLoading(true);
      const userProfile = await getCurrentUserProfile();

      if (!userProfile) {
        return;
      }

      const logEntries = await syncLogEntries();
      const races = load("races", []);

      const profile = buildAthleteProfile(userProfile, logEntries, races);

      const recentWeeklyKm: number[] = [];
      const recentFatigueScores: number[] = [];

      const now = new Date();
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
        readiness: readinessState,
        readinessScore: readiness.overallScore,
      });

      const raceResult = await getActivePriorityRace();
      if (raceResult.race) {
        const raceDate = new Date(raceResult.race.dateISO);
        const today = new Date();
        const daysToRace = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysToRace <= 7) {
          setTrainingPhase("race_week");
        } else if (daysToRace <= 21) {
          setTrainingPhase("taper");
        } else if (daysToRace <= 56) {
          setTrainingPhase("build");
        } else {
          setTrainingPhase("base");
        }
      } else {
        const mode = await detectTrainingMode();
        setTrainingPhase(mode.mode);
      }
    } catch (error) {
      console.error("[AdaptiveCoach] Failed to load athlete data:", error);
    } finally {
      setLoading(false);
    }
  }

  const distanceLabel = units === 'metric' ? 'Weekly Volume' : 'Weekly Mileage';
  const distanceUnit = units === 'metric' ? 'km' : 'mi';

  const averageVertical = useMemo(() => {
    if (!athleteProfile?.averageVertical) return 0;
    return Math.round(athleteProfile.averageVertical);
  }, [athleteProfile]);

  const readinessColor = useMemo(() => {
    if (!athleteProfile?.readiness) return "#64748b";
    switch (athleteProfile.readiness) {
      case "excellent": return "#22c55e";
      case "good": return "#06b6d4";
      case "fair": return "#f59e0b";
      case "poor": return "#ef4444";
      default: return "#64748b";
    }
  }, [athleteProfile]);

  const phaseInfo = useMemo(() => {
    const phases: Record<string, { label: string; color: string; icon: string }> = {
      base: { label: "Base Building", color: "#06b6d4", icon: "foundation" },
      build: { label: "Build Phase", color: "#8b5cf6", icon: "trending-up" },
      taper: { label: "Taper", color: "#f59e0b", icon: "wind" },
      race_week: { label: "Race Week", color: "#ef4444", icon: "flag" },
      maintenance: { label: "Maintenance", color: "#22c55e", icon: "refresh" },
      recovery: { label: "Recovery", color: "#64748b", icon: "heart" },
    };
    return phases[trainingPhase] || phases.base;
  }, [trainingPhase]);

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading && !athleteProfile) {
    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
        borderRadius: 16,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        padding: 20,
        backdropFilter: "blur(12px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 2s ease-in-out infinite"
          }}>
            <RefreshCw size={20} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Loading Training Intelligence...</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Analyzing your training profile</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
      borderRadius: 16,
      border: "1px solid rgba(255, 255, 255, 0.1)",
      overflow: "hidden",
      backdropFilter: "blur(12px)"
    }}>
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${phaseInfo.color}40 0%, ${phaseInfo.color}20 100%)`,
            border: `1px solid ${phaseInfo.color}60`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Zap size={18} color={phaseInfo.color} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Adaptive Ultra Training Coach</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: phaseInfo.color,
                background: `${phaseInfo.color}20`,
                padding: "2px 8px",
                borderRadius: 4
              }}>
                {phaseInfo.label}
              </span>
              {isExecuting && (
                <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
                  <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} />
                  Updating...
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "#64748b",
            padding: "4px 8px",
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 6
          }}>
            <Clock size={12} />
            {formatLastUpdate(lastExecuted)}
          </div>
          <button
            onClick={() => refresh()}
            disabled={isExecuting}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.05)",
              color: isExecuting ? "#64748b" : "#94a3b8",
              cursor: isExecuting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
          >
            <RefreshCw size={14} style={isExecuting ? { animation: "spin 1s linear infinite" } : {}} />
          </button>
        </div>
      </div>

      {athleteProfile && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12
          }}>
            <div style={{
              padding: 12,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Activity size={12} color="#94a3b8" />
                <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Readiness</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: readinessColor, textTransform: "capitalize" }}>
                {athleteProfile.readiness || "—"}
              </div>
              {athleteProfile.readinessScore !== undefined && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {Math.round(athleteProfile.readinessScore)}%
                </div>
              )}
            </div>

            <div style={{
              padding: 12,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <TrendingUp size={12} color="#94a3b8" />
                <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{distanceLabel}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                {athleteProfile.averageMileage?.toFixed(0) || "0"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{distanceUnit}/week</div>
            </div>

            <div style={{
              padding: 12,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Mountain size={12} color="#94a3b8" />
                <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vertical</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                {averageVertical}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>m/week</div>
            </div>

            <div style={{
              padding: 12,
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Zap size={12} color="#94a3b8" />
                <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Consistency</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                {athleteProfile.trainingConsistency || 0}%
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>last 4 weeks</div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 12,
              padding: 10,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 8,
              fontSize: 12,
              color: "#fca5a5"
            }}>
              {error}
            </div>
          )}

          {decision && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 12px",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: 8,
                color: "#93c5fd",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.2s"
              }}
            >
              <span>View Plan Details & Rationale</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {showDetails && decision && (
            <div style={{
              marginTop: 12,
              padding: 16,
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.06)"
            }}>
              {decision.finalReasoning && decision.finalReasoning.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>
                    Coaching Rationale
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#e2e8f0", lineHeight: 1.6 }}>
                    {decision.finalReasoning.map((reason, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {decision.adjustmentLayers && decision.adjustmentLayers.filter(l => l.applied).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase" }}>
                    Applied Adjustments
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {decision.adjustmentLayers.filter(l => l.applied).map((layer, i) => (
                      <span key={i} style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        background: "rgba(139, 92, 246, 0.15)",
                        border: "1px solid rgba(139, 92, 246, 0.3)",
                        borderRadius: 6,
                        color: "#c4b5fd"
                      }}>
                        {layer.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!athleteProfile && !loading && (
        <div style={{ padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
            Complete your profile in Settings to enable the Adaptive Coach
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
