import { useState, useMemo, useEffect } from 'react';
import type { SimulationOverrides, StartStrategy } from '@/types/whatif';
import type { PhysiologicalInputs, PhysiologicalSimulation } from '@/types/physiology';
import { DEFAULT_PHYSIOLOGICAL_INPUTS } from '@/types/physiology';
import { runPhysiologicalSimulation, runPhysiologicalSimulationWithPacing } from '@/utils/physiologySimulation';
import type { Race } from '@/utils/races';
import type { RaceSimulation } from '@/hooks/useRaceSimulation';
import WhatIfControls from './WhatIfControls';
import PhysiologicalControls from './PhysiologicalControls';
import EnergyFatigueDynamicsChart from './EnergyFatigueDynamicsChart';
import HydrationElectrolytesCard from './HydrationElectrolytesCard';
import GIDistressRiskCard from './GIDistressRiskCard';
import PerformanceImpactCard from './PerformanceImpactCard';
import CoachInsightsFeed from './CoachInsightsFeed';
import SimulationComparison from './SimulationComparison';
import StrategyRecommendation from './StrategyRecommendation';
import { compareSimulations } from '@/utils/whatifSimulation';
import { saveWhatIfScenario, getWhatIfScenarios, deleteWhatIfScenario, type DbWhatIfScenario } from '@/lib/database';
import { getStrategyLabel, getStrategyEmoji, getStrategyDescription } from '@/utils/startingStrategy';
import PacingStrategyForm from './PacingStrategyForm';
import PacingChart from './PacingChart';
import type { PacingSegment } from '@/types/pacing';
import type { DbPacingStrategy } from '@/lib/database';
import { generateAutoPacing } from '@/utils/pacingGeneration';

type WhatIfSimulatorTabsProps = {
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

export default function WhatIfSimulatorTabs({
  simulation,
  adjustedSimulation,
  overrides,
  onOverridesChange,
  onResetOverrides,
}: WhatIfSimulatorTabsProps) {
  const [activeTab, setActiveTab] = useState<'conditions' | 'nutrition' | 'strategy' | 'results'>('conditions');
  const [physiologicalInputs, setPhysiologicalInputs] = useState<PhysiologicalInputs>(DEFAULT_PHYSIOLOGICAL_INPUTS);
  const [savedScenarios, setSavedScenarios] = useState<DbWhatIfScenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pacingSegments, setPacingSegments] = useState<PacingSegment[]>([]);
  const [showPacingEditor, setShowPacingEditor] = useState(false);
  const [pacingStrategy, setPacingStrategy] = useState<DbPacingStrategy | null>(null);

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

  const hasOverrides = Object.keys(overrides).length > 0;

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

  const tabItems = [
    { id: 'conditions' as const, label: 'Conditions', icon: '🌡️' },
    { id: 'nutrition' as const, label: 'Nutrition', icon: '🍌' },
    { id: 'strategy' as const, label: 'Strategy', icon: '⚖️' },
    { id: 'results' as const, label: 'Results', icon: '🏁' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="race-tabs" style={{ margin: '-20px -20px 20px -20px', padding: '16px 20px' }}>
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`race-tab ${activeTab === tab.id ? 'race-tab-active' : ''}`}
          >
            <span style={{ marginRight: 6 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'conditions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

          {hasOverrides && (
            <div style={{
              padding: 16,
              background: 'rgba(255, 92, 122, 0.08)',
              border: '1px solid rgba(255, 92, 122, 0.2)',
              borderRadius: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  Save this configuration for later
                </span>
                <button
                  onClick={() => setShowSaveDialog(!showSaveDialog)}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #FF5C7A 0%, #FF8A65 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#0B0B12',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Save Scenario
                </button>
              </div>

              {showSaveDialog && (
                <div style={{ marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder="Scenario name..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      fontSize: '0.9rem',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSaveScenario}
                      disabled={!scenarioName.trim()}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: scenarioName.trim() ? 'linear-gradient(135deg, #FF5C7A 0%, #FF8A65 100%)' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 8,
                        color: scenarioName.trim() ? '#0B0B12' : 'rgba(255,255,255,0.4)',
                        fontWeight: 600,
                        cursor: scenarioName.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#fff',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {savedScenarios.length > 0 && (
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                Saved Scenarios ({savedScenarios.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    style={{
                      padding: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{scenario.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        {scenario.temperature && `${scenario.temperature}C`}
                        {scenario.humidity && ` - ${scenario.humidity}%`}
                        {scenario.fueling_rate && ` - ${scenario.fueling_rate}g/h`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleLoadScenario(scenario)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255, 92, 122, 0.15)',
                          border: '1px solid rgba(255, 92, 122, 0.3)',
                          borderRadius: 6,
                          color: '#FF5C7A',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => scenario.id && handleDeleteScenario(scenario.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(255, 92, 122, 0.1)',
                          border: '1px solid rgba(255, 92, 122, 0.2)',
                          borderRadius: 6,
                          color: '#FF5C7A',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
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
        <div>
          <PhysiologicalControls
            inputs={physiologicalInputs}
            onChange={setPhysiologicalInputs}
          />
        </div>
      )}

      {activeTab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: 16 }}>
              Starting Strategy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {(['conservative', 'target', 'aggressive'] as const).map((strategy) => {
                const isSelected = overrides.startStrategy === strategy;
                const emoji = getStrategyEmoji(strategy);
                const label = getStrategyLabel(strategy);

                return (
                  <button
                    key={strategy}
                    onClick={() => {
                      const newOverrides = { ...overrides, startStrategy: strategy };
                      onOverridesChange(newOverrides);
                    }}
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255, 92, 122, 0.2) 0%, rgba(255, 138, 101, 0.1) 100%)'
                        : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '2px solid #FF5C7A' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{emoji}</div>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isSelected ? '#FF5C7A' : '#fff',
                    }}>
                      {label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {overrides.startStrategy && (
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
          )}

          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                Pacing Strategy
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!showPacingEditor && !pacingStrategy && (
                  <>
                    <button
                      onClick={handleGenerateAutoPacing}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(255, 92, 122, 0.15)',
                        border: '1px solid rgba(255, 92, 122, 0.3)',
                        borderRadius: 6,
                        color: '#FF5C7A',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Auto-Generate
                    </button>
                    <button
                      onClick={() => setShowPacingEditor(true)}
                      style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, #FF5C7A 0%, #FF8A65 100%)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#0B0B12',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Create Plan
                    </button>
                  </>
                )}
                {pacingStrategy && !showPacingEditor && (
                  <button
                    onClick={() => setShowPacingEditor(true)}
                    style={{
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #FF5C7A 0%, #FF8A65 100%)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#0B0B12',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
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
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {pacingStrategy?.name || 'Custom pacing plan'} - {pacingSegments.length} segments
                </div>
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
              }}>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: 0 }}>
                  No pacing strategy defined. Create a custom plan or auto-generate one based on conditions.
                </p>
              </div>
            )}
          </div>

          {physiologicalSim && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: 16 }}>
                Energy & Fatigue Dynamics
              </div>
              <EnergyFatigueDynamicsChart
                energyDynamics={physiologicalSim.energyDynamics}
                distanceKm={simulation.race.distanceKm || 10}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {comparison && (
            <SimulationComparison
              comparison={comparison}
              distanceKm={simulation.race.distanceKm || 10}
              startStrategy={overrides.startStrategy}
            />
          )}
          {physiologicalSim && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: 16,
              }}>
                <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
                <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
                <PerformanceImpactCard performanceImpact={physiologicalSim.performanceImpact} />
              </div>
              <CoachInsightsFeed insights={physiologicalSim.insights} />
            </>
          )}
          {!comparison && !physiologicalSim && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.5 }}>🔮</div>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)', marginBottom: 0 }}>
                Adjust conditions in other tabs to see simulation results here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
