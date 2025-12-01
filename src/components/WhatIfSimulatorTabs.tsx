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

  const TabButton = ({ tabId, label }: { tabId: typeof activeTab; label: string }) => (
    <button
      className="btn"
      onClick={() => setActiveTab(tabId)}
      style={{
        padding: '10px 20px',
        background: activeTab === tabId ? 'var(--brand)' : 'var(--bg-secondary)',
        color: activeTab === tabId ? 'white' : 'inherit',
        fontWeight: activeTab === tabId ? 600 : 400,
        border: activeTab === tabId ? '2px solid var(--brand)' : '1px solid var(--line)',
        flex: isMobile ? '1' : 'auto',
        minWidth: isMobile ? 'auto' : 140,
      }}
    >
      {label}
    </button>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <details open>
          <summary style={{
            cursor: 'pointer',
            padding: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            fontWeight: 600,
            listStyle: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>🌡️ Conditions</span>
            <span>▼</span>
          </summary>
          <div style={{ padding: 12 }}>
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
          </div>
        </details>

        <details>
          <summary style={{
            cursor: 'pointer',
            padding: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            fontWeight: 600,
            listStyle: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>🍌 Nutrition</span>
            <span>▼</span>
          </summary>
          <div style={{ padding: 12 }}>
            <PhysiologicalControls
              inputs={physiologicalInputs}
              onChange={setPhysiologicalInputs}
            />
          </div>
        </details>

        <details>
          <summary style={{
            cursor: 'pointer',
            padding: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            fontWeight: 600,
            listStyle: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>⚖️ Strategy</span>
            <span>▼</span>
          </summary>
          <div style={{ padding: 12 }}>
            <div style={{ marginBottom: 16 }}>
              <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
                Starting Strategy
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                        padding: '12px',
                        textAlign: 'left',
                        background: isSelected ? 'var(--brand-bg)' : 'var(--bg)',
                        border: isSelected ? '2px solid var(--brand)' : '1px solid var(--line)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{emoji}</span>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? 'var(--brand)' : 'inherit',
                      }}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}>
                <div className="small" style={{ fontWeight: 600 }}>
                  Pacing Strategy
                </div>
                {!showPacingEditor && (
                  <button
                    className="btn small"
                    onClick={() => setShowPacingEditor(true)}
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  >
                    {pacingStrategy ? 'Edit' : 'Create'}
                  </button>
                )}
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
                <PacingChart segments={pacingSegments} />
              ) : (
                <div className="small" style={{ color: 'var(--muted)', padding: 8 }}>
                  No pacing plan
                </div>
              )}
            </div>

            {overrides.startStrategy && (
              <div style={{ marginBottom: 16 }}>
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

            {physiologicalSim && (
              <div style={{ marginTop: 16 }}>
                <EnergyFatigueDynamicsChart
                  energyDynamics={physiologicalSim.energyDynamics}
                  distanceKm={simulation.race.distanceKm || 10}
                />
              </div>
            )}
          </div>
        </details>

        <details>
          <summary style={{
            cursor: 'pointer',
            padding: 12,
            background: 'var(--bg-secondary)',
            borderRadius: 8,
            fontWeight: 600,
            listStyle: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>🏁 Results</span>
            <span>▼</span>
          </summary>
          <div style={{ padding: 12 }}>
            {comparison && (
              <div style={{ marginBottom: 20 }}>
                <SimulationComparison
                  comparison={comparison}
                  distanceKm={simulation.race.distanceKm || 10}
                  startStrategy={overrides.startStrategy}
                />
              </div>
            )}
            {physiologicalSim && (
              <>
                <div className="grid cols-1" style={{ gap: 16, marginBottom: 20 }}>
                  <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
                  <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
                  <PerformanceImpactCard performanceImpact={physiologicalSim.performanceImpact} />
                </div>
                <CoachInsightsFeed insights={physiologicalSim.insights} />
              </>
            )}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid var(--line)',
        paddingBottom: 8,
        flexWrap: 'wrap',
      }}>
        <TabButton tabId="conditions" label="🌡️ Conditions" />
        <TabButton tabId="nutrition" label="🍌 Nutrition" />
        <TabButton tabId="strategy" label="⚖️ Strategy" />
        <TabButton tabId="results" label="🏁 Results" />
      </div>

      {activeTab === 'conditions' && (
        <div>
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
            <div style={{ marginTop: 20 }}>
              <button
                className="btn primary"
                onClick={() => setShowSaveDialog(!showSaveDialog)}
                style={{ marginRight: 8 }}
              >
                Save Scenario
              </button>

              {showSaveDialog && (
                <div style={{
                  marginTop: 12,
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 8,
                }}>
                  <input
                    type="text"
                    placeholder="Scenario name..."
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 4,
                      border: '1px solid var(--line)',
                      marginBottom: 8,
                    }}
                  />
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn primary"
                      onClick={handleSaveScenario}
                      disabled={!scenarioName.trim()}
                      style={{ flex: 1 }}
                    >
                      Save
                    </button>
                    <button
                      className="btn"
                      onClick={() => setShowSaveDialog(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {savedScenarios.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="small" style={{ fontWeight: 600, marginBottom: 12 }}>
                Saved Scenarios ({savedScenarios.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {savedScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="card"
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{scenario.name}</div>
                        <div className="small" style={{ color: 'var(--muted)' }}>
                          {scenario.temperature && `${scenario.temperature}°C • `}
                          {scenario.humidity && `${scenario.humidity}% • `}
                          {scenario.fueling_rate && `${scenario.fueling_rate}g/h`}
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn small"
                          onClick={() => handleLoadScenario(scenario)}
                          style={{ padding: '6px 12px' }}
                        >
                          Load
                        </button>
                        <button
                          className="btn small"
                          onClick={() => scenario.id && handleDeleteScenario(scenario.id)}
                          style={{ padding: '6px 12px', background: 'var(--bad)' }}
                        >
                          Delete
                        </button>
                      </div>
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
        <div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>
              Starting Strategy
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
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
                      textAlign: 'left',
                      background: isSelected ? 'var(--brand-bg)' : 'var(--bg-secondary)',
                      border: isSelected ? '2px solid var(--brand)' : '1px solid var(--line)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{emoji}</div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: isSelected ? 'var(--brand)' : 'inherit',
                    }}>
                      {label}
                    </div>
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

          {physiologicalSim && (
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 16 }}>
                Energy & Fatigue Dynamics
              </h3>
              <EnergyFatigueDynamicsChart
                energyDynamics={physiologicalSim.energyDynamics}
                distanceKm={simulation.race.distanceKm || 10}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'results' && (
        <div>
          {comparison && (
            <div style={{ marginBottom: 20 }}>
              <SimulationComparison
                comparison={comparison}
                distanceKm={simulation.race.distanceKm || 10}
                startStrategy={overrides.startStrategy}
              />
            </div>
          )}
          {physiologicalSim && (
            <>
              <div className="grid cols-3" style={{ gap: 16, marginBottom: 20 }}>
                <HydrationElectrolytesCard hydration={physiologicalSim.hydration} />
                <GIDistressRiskCard giRisk={physiologicalSim.giRisk} />
                <PerformanceImpactCard performanceImpact={physiologicalSim.performanceImpact} />
              </div>
              <CoachInsightsFeed insights={physiologicalSim.insights} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
