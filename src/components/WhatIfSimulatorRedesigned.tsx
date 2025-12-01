import { useState, useMemo, useEffect } from 'react';
import type { SimulationOverrides, StartStrategy } from '@/types/whatif';
import type { PhysiologicalInputs, PhysiologicalSimulation } from '@/types/physiology';
import { DEFAULT_PHYSIOLOGICAL_INPUTS } from '@/types/physiology';
import { runPhysiologicalSimulation, runPhysiologicalSimulationWithPacing } from '@/utils/physiologySimulation';
import type { RaceSimulation } from '@/hooks/useRaceSimulation';
import RaceContextHeader from './RaceContextHeader';
import WhatIfControls from './WhatIfControls';
import PhysiologicalControls from './PhysiologicalControls';
import EnergyFatigueDynamicsChart from './EnergyFatigueDynamicsChart';
import TimeToExhaustionGauge from './TimeToExhaustionGauge';
import HydrationElectrolytesCard from './HydrationElectrolytesCard';
import GIDistressRiskCard from './GIDistressRiskCard';
import PerformanceImpactCard from './PerformanceImpactCard';
import CoachInsightsFeed from './CoachInsightsFeed';
import SimulationComparison from './SimulationComparison';
import StrategyRecommendation from './StrategyRecommendation';
import ResultsSidebar from './ResultsSidebar';
import FloatingSummaryBar from './FloatingSummaryBar';
import ResultsModal from './ResultsModal';
import { compareSimulations } from '@/utils/whatifSimulation';
import { saveWhatIfScenario, getWhatIfScenarios, deleteWhatIfScenario, type DbWhatIfScenario, getPacingStrategy } from '@/lib/database';
import { getStrategyLabel, getStrategyEmoji, getStrategyDescription } from '@/utils/startingStrategy';
import { extractBaselineMetrics, type BaselineMetrics } from '@/utils/baselineComparison';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import PacingStrategyForm from './PacingStrategyForm';
import PacingChart from './PacingChart';
import type { PacingSegment } from '@/types/pacing';
import type { DbPacingStrategy } from '@/lib/database';
import { generateAutoPacing } from '@/utils/pacingGeneration';

type WhatIfSimulatorRedesignedProps = {
  simulation: RaceSimulation;
  adjustedSimulation: {
    predictedTimeMin: number;
    factors: {
      terrain: number;
      elevation: number;
      climate: number;
      fatigue: number;
    };
  } | null;
  overrides: SimulationOverrides;
  onOverridesChange: (overrides: SimulationOverrides) => void;
  onResetOverrides: () => void;
};

export default function WhatIfSimulatorRedesigned({
  simulation,
  adjustedSimulation,
  overrides,
  onOverridesChange,
  onResetOverrides,
}: WhatIfSimulatorRedesignedProps) {
  const [activeTab, setActiveTab] = useState<'conditions' | 'nutrition' | 'energy' | 'strategy'>('conditions');
  const [physiologicalInputs, setPhysiologicalInputs] = useState<PhysiologicalInputs>(DEFAULT_PHYSIOLOGICAL_INPUTS);
  const [savedScenarios, setSavedScenarios] = useState<DbWhatIfScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['conditions']);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [baseline, setBaseline] = useState<BaselineMetrics | null>(null);
  const { isVisible, forceVisible } = useScrollDirection({ threshold: 50, throttleMs: 100 });
  const [pacingSegments, setPacingSegments] = useState<PacingSegment[]>([]);
  const [showPacingEditor, setShowPacingEditor] = useState(false);
  const [pacingStrategy, setPacingStrategy] = useState<DbPacingStrategy | null>(null);

  const debouncedOverrides = useDebouncedValue(overrides, 250);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadScenarios() {
      if (simulation?.race.id) {
        const scenarios = await getWhatIfScenarios(simulation.race.id);
        setSavedScenarios(scenarios);
      }
    }
    loadScenarios();
  }, [simulation?.race.id]);

  // Load pacing strategy from database when race changes
  useEffect(() => {
    async function loadPacingStrategy() {
      if (simulation?.race.id) {
        const strategy = await getPacingStrategy(simulation.race.id);
        if (strategy) {
          setPacingStrategy(strategy);
          setPacingSegments(strategy.segments);
        } else {
          setPacingStrategy(null);
          setPacingSegments([]);
        }
      }
    }
    loadPacingStrategy();

    // Listen for pacing strategy updates from other components
    const handlePacingUpdate = (e: CustomEvent) => {
      if (e.detail.raceId === simulation?.race.id) {
        loadPacingStrategy();
      }
    };
    window.addEventListener('pacing-strategy-updated' as any, handlePacingUpdate as any);
    return () => {
      window.removeEventListener('pacing-strategy-updated' as any, handlePacingUpdate as any);
    };
  }, [simulation?.race.id]);

  useEffect(() => {
    forceVisible();
  }, [overrides, physiologicalInputs, forceVisible]);

  const comparison = useMemo(() => {
    if (!simulation || !adjustedSimulation || Object.keys(overrides).length === 0) {
      return null;
    }

    return compareSimulations(
      simulation.predictedTimeMin,
      adjustedSimulation.predictedTimeMin,
      {
        terrain: simulation.factors.terrainFactor,
        elevation: simulation.factors.elevationFactor,
        climate: simulation.factors.climateFactor,
        fatigue: simulation.factors.fatiguePenalty,
      },
      adjustedSimulation.factors,
      simulation.race.distanceKm || 10
    );
  }, [simulation, adjustedSimulation, overrides]);

  const physiologicalSim = useMemo<PhysiologicalSimulation | null>(() => {
    if (!simulation) return null;

    const temperature = overrides.temperature ?? 20;
    const humidity = overrides.humidity ?? 50;
    const readinessScore = overrides.readiness ?? simulation.readinessScore;
    const selectedStrategy = overrides.startStrategy;

    // Use pacing-aware simulation if pacing segments are defined
    if (pacingSegments.length > 0) {
      return runPhysiologicalSimulationWithPacing(
        simulation.race.distanceKm || 10,
        adjustedSimulation?.predictedTimeMin ?? simulation.predictedTimeMin,
        physiologicalInputs,
        temperature,
        humidity,
        readinessScore,
        pacingSegments
      );
    }

    return runPhysiologicalSimulation(
      simulation.race.distanceKm || 10,
      adjustedSimulation?.predictedTimeMin ?? simulation.predictedTimeMin,
      physiologicalInputs,
      temperature,
      humidity,
      readinessScore,
      selectedStrategy
    );
  }, [
    simulation,
    adjustedSimulation,
    physiologicalInputs,
    overrides.temperature,
    overrides.humidity,
    overrides.readiness,
    overrides.startStrategy,
    pacingSegments,
  ]);

  useEffect(() => {
    if (simulation && physiologicalSim && !baseline) {
      const baselineMetrics = extractBaselineMetrics(simulation, physiologicalSim);
      setBaseline(baselineMetrics);
    }
  }, [simulation, physiologicalSim, baseline]);

  const handleSaveScenario = async () => {
    if (!simulation || !scenarioName.trim() || !physiologicalSim) {
      return;
    }

    const scenario: DbWhatIfScenario = {
      race_id: simulation.race.id,
      name: scenarioName.trim(),
      temperature: overrides.temperature,
      humidity: overrides.humidity,
      elevation: overrides.elevation,
      readiness: overrides.readiness,
      surface: overrides.surface,
      start_strategy: overrides.startStrategy,
      fueling_rate: physiologicalInputs.fuelingRate,
      fluid_intake: physiologicalInputs.fluidIntake,
      sodium_intake: physiologicalInputs.sodiumIntake,
      hydration_pct: physiologicalSim.hydration.hydrationPct,
      gi_risk_pct: physiologicalSim.giRisk.riskPct,
      performance_penalty_pct: physiologicalSim.performanceImpact.totalPenaltyPct,
      predicted_time_min: adjustedSimulation?.predictedTimeMin ?? simulation.predictedTimeMin,
    };

    const success = await saveWhatIfScenario(scenario);
    if (success) {
      const scenarios = await getWhatIfScenarios(simulation.race.id);
      setSavedScenarios(scenarios);
      setScenarioName('');
      setShowSaveDialog(false);
    }
  };

  const handleLoadScenario = (scenario: DbWhatIfScenario) => {
    const loadedOverrides: SimulationOverrides = {};
    if (scenario.temperature !== null && scenario.temperature !== undefined) {
      loadedOverrides.temperature = scenario.temperature;
    }
    if (scenario.humidity !== null && scenario.humidity !== undefined) {
      loadedOverrides.humidity = scenario.humidity;
    }
    if (scenario.elevation !== null && scenario.elevation !== undefined) {
      loadedOverrides.elevation = scenario.elevation;
    }
    if (scenario.readiness !== null && scenario.readiness !== undefined) {
      loadedOverrides.readiness = scenario.readiness;
    }
    if (scenario.surface) {
      loadedOverrides.surface = scenario.surface;
    }
    if (scenario.start_strategy) {
      loadedOverrides.startStrategy = scenario.start_strategy;
    }
    onOverridesChange(loadedOverrides);

    if (scenario.fueling_rate || scenario.fluid_intake || scenario.sodium_intake) {
      setPhysiologicalInputs({
        fuelingRate: scenario.fueling_rate ?? DEFAULT_PHYSIOLOGICAL_INPUTS.fuelingRate,
        fluidIntake: scenario.fluid_intake ?? DEFAULT_PHYSIOLOGICAL_INPUTS.fluidIntake,
        sodiumIntake: scenario.sodium_intake ?? DEFAULT_PHYSIOLOGICAL_INPUTS.sodiumIntake,
      });
    }
  };

  const handleDeleteScenario = async (scenarioId: string) => {
    if (!simulation) return;
    const success = await deleteWhatIfScenario(scenarioId);
    if (success) {
      const scenarios = await getWhatIfScenarios(simulation.race.id);
      setSavedScenarios(scenarios);
    }
  };

  const handlePacingSave = async (strategy: DbPacingStrategy) => {
    setPacingStrategy(strategy);
    setPacingSegments(strategy.segments);
    setShowPacingEditor(false);
  };

  const handlePacingCancel = () => {
    setShowPacingEditor(false);
  };

  const handleGenerateAutoPacing = () => {
    if (!simulation) return;

    const autoSegments = generateAutoPacing({
      race: simulation.race,
      readinessScore: simulation.readinessScore,
      factors: simulation.factors,
      basePace: simulation.avgPace,
      segmentLengthKm: 5,
    });

    setPacingSegments(autoSegments);
    const autoStrategy: DbPacingStrategy = {
      race_id: simulation.race.id,
      name: `${simulation.race.name} Auto-Generated`,
      mode: 'auto',
      segments: autoSegments,
    };
    setPacingStrategy(autoStrategy);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const TabButton = ({ tabId, icon, label }: { tabId: typeof activeTab; icon: string; label: string }) => {
    const isActive = activeTab === tabId;

    return (
      <button
        className="btn"
        onClick={() => setActiveTab(tabId)}
        style={{
          padding: '12px 24px',
          background: isActive ? 'var(--brand)' : 'transparent',
          color: isActive ? 'white' : 'var(--text)',
          fontWeight: isActive ? 700 : 500,
          border: 'none',
          borderBottom: isActive ? '3px solid var(--brand)' : '3px solid transparent',
          borderRadius: '8px 8px 0 0',
          transition: 'all 0.2s ease',
          flex: isMobile ? '1' : 'auto',
          minWidth: isMobile ? 'auto' : 140,
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          justifyContent: 'center',
          position: 'relative',
          boxShadow: isActive ? '0 -2px 8px rgba(59, 130, 246, 0.3)' : 'none',
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  const AccordionSection = ({
    id,
    icon,
    title,
    children,
  }: {
    id: string;
    icon: string;
    title: string;
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.includes(id);

    return (
      <div style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
        transition: 'all 0.3s ease',
      }}>
        <button
          onClick={() => toggleSection(id)}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: isExpanded ? 'var(--brand-bg)' : 'var(--bg-secondary)',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '1rem',
            transition: 'background 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.3rem' }}>{icon}</span>
            <span>{title}</span>
          </div>
          <span style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            fontSize: '1.2rem',
          }}>
            ▼
          </span>
        </button>

        <div style={{
          maxHeight: isExpanded ? '2000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}>
          <div style={{ padding: '20px' }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  if (isMobile) {
    return (
      <>
        <div style={{ paddingBottom: 80 }}>
          <RaceContextHeader
            race={simulation.race}
            readinessScore={simulation.readinessScore}
            overrides={overrides}
            onSave={() => setShowSaveDialog(true)}
            onReset={onResetOverrides}
          />

        <AccordionSection id="conditions" icon="🌡️" title="Conditions">
          <WhatIfControls
            overrides={overrides}
            onChange={onOverridesChange}
            onReset={onResetOverrides}
            currentValues={{
              temperature: 20,
              humidity: 50,
              elevation: simulation.race.elevationM,
              readiness: simulation.readinessScore,
              surface: simulation.race.surface,
            }}
          />
        </AccordionSection>

        <AccordionSection id="nutrition" icon="🍌" title="Nutrition">
          <PhysiologicalControls
            inputs={physiologicalInputs}
            onChange={setPhysiologicalInputs}
          />
          {physiologicalSim && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
                <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
              </div>
            </div>
          )}
        </AccordionSection>

        <AccordionSection id="energy" icon="⚡" title="Energy">
          {physiologicalSim ? (
            <>
              <TimeToExhaustionGauge
                energyDynamics={physiologicalSim.energyDynamics}
                totalDistance={simulation.race.distanceKm || 10}
              />
              <div style={{ marginTop: 20 }}>
                <EnergyFatigueDynamicsChart
                  energyDynamics={physiologicalSim.energyDynamics}
                  distanceKm={simulation.race.distanceKm || 10}
                />
              </div>
            </>
          ) : (
            <p className="small" style={{ color: 'var(--muted)' }}>
              Configure conditions and nutrition to view energy dynamics.
            </p>
          )}
        </AccordionSection>

        <AccordionSection id="strategy" icon="🎯" title="Strategy">
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>
              Select Starting Strategy
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['conservative', 'target', 'aggressive'] as const).map((strategy) => {
                const isSelected = overrides.startStrategy === strategy;
                const emoji = getStrategyEmoji(strategy);
                const label = getStrategyLabel(strategy);
                const description = getStrategyDescription(strategy);

                return (
                  <button
                    key={strategy}
                    onClick={() => {
                      const newOverrides = { ...overrides, startStrategy: strategy };
                      onOverridesChange(newOverrides);
                    }}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      background: isSelected ? 'var(--brand-bg)' : 'var(--bg-secondary)',
                      border: isSelected ? '2px solid var(--brand)' : '1px solid var(--line)',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: isSelected ? 'var(--brand)' : 'inherit',
                      }}>
                        {label}
                      </span>
                    </div>
                    <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
                      {description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {overrides.startStrategy && (
            <div style={{ marginBottom: 20 }}>
              <StrategyRecommendation
                strategy={overrides.startStrategy}
                conditions={{
                  temperature: overrides.temperature,
                  humidity: overrides.humidity,
                  elevation: overrides.elevation,
                  readiness: overrides.readiness ?? simulation.readinessScore,
                  distanceKm: simulation.race.distanceKm,
                }}
              />
            </div>
          )}
        </AccordionSection>

        </div>

        {baseline && physiologicalSim && (
          <FloatingSummaryBar
            predictedTimeMin={adjustedSimulation?.predictedTimeMin ?? simulation.predictedTimeMin}
            baseline={baseline}
            physiologicalSim={physiologicalSim}
            isVisible={isVisible}
            onExpand={() => setShowResultsModal(true)}
          />
        )}

        {showResultsModal && physiologicalSim && (
          <ResultsModal
            physiologicalSim={physiologicalSim}
            onClose={() => setShowResultsModal(false)}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <RaceContextHeader
        race={simulation.race}
        readinessScore={simulation.readinessScore}
        overrides={overrides}
        onSave={() => setShowSaveDialog(true)}
        onReset={onResetOverrides}
      />

      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: '2px solid var(--line)',
        marginBottom: 24,
      }}>
        <TabButton tabId="conditions" icon="🌡️" label="Conditions" />
        <TabButton tabId="nutrition" icon="🍌" label="Nutrition" />
        <TabButton tabId="energy" icon="⚡" label="Energy" />
        <TabButton tabId="strategy" icon="🎯" label="Strategy" />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 24,
        alignItems: 'start',
      }}>
        <div style={{
          minHeight: 400,
          animation: 'fadeIn 0.3s ease',
        }}>
        {activeTab === 'conditions' && (
          <div style={{ animation: 'slideIn 0.3s ease' }}>
            <WhatIfControls
              overrides={overrides}
              onChange={onOverridesChange}
              onReset={onResetOverrides}
              currentValues={{
                temperature: 20,
                humidity: 50,
                elevation: simulation.race.elevationM,
                readiness: simulation.readinessScore,
                surface: simulation.race.surface,
              }}
            />

            {savedScenarios.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 12 }}>
                  📊 Saved Scenarios ({savedScenarios.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {savedScenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      style={{
                        background: 'var(--bg-secondary)',
                        padding: 16,
                        borderRadius: 8,
                        border: '1px solid var(--line)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--brand)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--line)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{scenario.name}</div>
                        <div className="small" style={{ color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {scenario.temperature && <span>🌡️ {scenario.temperature}°C</span>}
                          {scenario.humidity && <span>💧 {scenario.humidity}%</span>}
                          {scenario.fueling_rate && <span>🍌 {scenario.fueling_rate}g/h</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn small primary"
                          onClick={() => handleLoadScenario(scenario)}
                          style={{ padding: '6px 16px' }}
                        >
                          Load
                        </button>
                        <button
                          className="btn small"
                          onClick={() => scenario.id && handleDeleteScenario(scenario.id)}
                          style={{ padding: '6px 16px', background: 'var(--bad)', color: 'white' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div style={{ animation: 'slideIn 0.3s ease' }}>
            <PhysiologicalControls
              inputs={physiologicalInputs}
              onChange={setPhysiologicalInputs}
            />

            {physiologicalSim && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
                  <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'energy' && (
          <div style={{ animation: 'slideIn 0.3s ease' }}>
            {physiologicalSim ? (
              <>
                <TimeToExhaustionGauge
                  energyDynamics={physiologicalSim.energyDynamics}
                  totalDistance={simulation.race.distanceKm || 10}
                />

                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>
                    Energy & Fatigue Dynamics
                  </h3>
                  <EnergyFatigueDynamicsChart
                    energyDynamics={physiologicalSim.energyDynamics}
                    distanceKm={simulation.race.distanceKm || 10}
                  />
                </div>
              </>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderRadius: 8,
              }}>
                <p className="small" style={{ color: 'var(--muted)' }}>
                  Configure conditions and nutrition settings to view energy dynamics.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'strategy' && (
          <div style={{ animation: 'slideIn 0.3s ease' }}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>
                Select Starting Strategy
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {(['conservative', 'target', 'aggressive'] as const).map((strategy) => {
                  const isSelected = overrides.startStrategy === strategy;
                  const emoji = getStrategyEmoji(strategy);
                  const label = getStrategyLabel(strategy);
                  const description = getStrategyDescription(strategy);

                  return (
                    <button
                      key={strategy}
                      onClick={() => {
                        const newOverrides = { ...overrides, startStrategy: strategy };
                        onOverridesChange(newOverrides);
                      }}
                      style={{
                        padding: '20px',
                        textAlign: 'left',
                        background: isSelected ? 'var(--brand-bg)' : 'var(--bg-secondary)',
                        border: isSelected ? '3px solid var(--brand)' : '2px solid var(--line)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--brand)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--line)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>{emoji}</div>
                      <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        marginBottom: 8,
                        color: isSelected ? 'var(--brand)' : 'inherit',
                      }}>
                        {label}
                      </div>
                      <div className="small" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                        {description}
                      </div>
                      {isSelected && (
                        <div style={{
                          marginTop: 12,
                          padding: '6px 12px',
                          background: 'var(--brand)',
                          color: 'white',
                          borderRadius: 6,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          textAlign: 'center',
                        }}>
                          SELECTED
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {overrides.startStrategy && (
              <div style={{ marginBottom: 24 }}>
                <StrategyRecommendation
                  strategy={overrides.startStrategy}
                  conditions={{
                    temperature: overrides.temperature,
                    humidity: overrides.humidity,
                    elevation: overrides.elevation,
                    readiness: overrides.readiness ?? simulation.readinessScore,
                    distanceKm: simulation.race.distanceKm,
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
                  Pacing Strategy
                </h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!showPacingEditor && !pacingStrategy && (
                    <>
                      <button
                        className="btn small"
                        onClick={handleGenerateAutoPacing}
                        style={{ padding: '6px 12px' }}
                      >
                        Auto-Generate
                      </button>
                      <button
                        className="btn small primary"
                        onClick={() => setShowPacingEditor(true)}
                        style={{ padding: '6px 12px' }}
                      >
                        Create Plan
                      </button>
                    </>
                  )}
                  {pacingStrategy && !showPacingEditor && (
                    <button
                      className="btn small primary"
                      onClick={() => setShowPacingEditor(true)}
                      style={{ padding: '6px 12px' }}
                    >
                      Edit Plan
                    </button>
                  )}
                </div>
              </div>

              {showPacingEditor ? (
                <PacingStrategyForm
                  raceId={simulation.race.id}
                  raceName={simulation.race.name}
                  raceDistanceKm={simulation.race.distanceKm || 10}
                  existingStrategy={pacingStrategy}
                  onSave={handlePacingSave}
                  onCancel={handlePacingCancel}
                  onGenerateAuto={handleGenerateAutoPacing}
                />
              ) : pacingSegments.length > 0 ? (
                <div>
                  <PacingChart segments={pacingSegments} />
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div className="small" style={{ color: 'var(--muted)' }}>
                      {pacingStrategy?.name || 'Custom pacing plan'} • {pacingSegments.length} segments
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                }}>
                  <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                    No pacing strategy defined. Create a custom plan or auto-generate one based on conditions.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        </div>

        {baseline && (
          <ResultsSidebar
            simulation={simulation}
            adjustedSimulation={adjustedSimulation}
            baseline={baseline}
            physiologicalSim={physiologicalSim}
            hasOverrides={hasOverrides}
          />
        )}
      </div>

      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: 'var(--bg)',
            padding: 32,
            borderRadius: 16,
            maxWidth: 500,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'scaleIn 0.3s ease',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.5rem', fontWeight: 700 }}>
              💾 Save Scenario
            </h3>
            <input
              type="text"
              placeholder="Enter scenario name..."
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                border: '2px solid var(--line)',
                marginBottom: 20,
                fontSize: '1rem',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brand)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn primary"
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
                style={{ flex: 1, padding: '12px', fontWeight: 600 }}
              >
                Save
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowSaveDialog(false);
                  setScenarioName('');
                }}
                style={{ flex: 1, padding: '12px', fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
