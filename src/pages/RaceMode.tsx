import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '@/i18n';
import { useRaceSimulation } from '@/hooks/useRaceSimulation';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import { listRaces, type Race } from '@/utils/races';
import type { SimulationOverrides } from '@/types/whatif';
import WhatIfSimulatorTabs from '@/components/WhatIfSimulatorTabs';
import PacingChart from '@/components/PacingChart';
import PacingStrategyForm from '@/components/PacingStrategyForm';
import FactorBreakdown from '@/components/FactorBreakdown';
import SimulationFactorsCard from '@/components/SimulationFactorsCard';
import {
  calculateOverriddenTerrainFactor,
  calculateOverriddenElevationFactor,
  calculateOverriddenClimateFactor,
  calculateOverriddenFatiguePenalty,
  applyOverridesToSimulation,
} from '@/utils/whatifSimulation';
import { getPacingStrategy, type DbPacingStrategy } from '@/lib/database';
import { generateAutoPacing } from '@/utils/pacingGeneration';

export default function RaceMode() {
  const t = useT();
  const [selectedRaceId, setSelectedRaceId] = useState<string | undefined>(undefined);
  const [showPaceBreakdown, setShowPaceBreakdown] = useState(false);
  const [showFactors, setShowFactors] = useState(false);
  const [allRaces, setAllRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);
  const [showWhatIf, setShowWhatIf] = useState(true);
  const [overrides, setOverrides] = useState<SimulationOverrides>({});
  const [pacingStrategy, setPacingStrategy] = useState<DbPacingStrategy | null>(null);
  const [showPacingForm, setShowPacingForm] = useState(false);
  const [pacingMode, setPacingMode] = useState<'view' | 'edit'>('view');

  const { simulation, loading, error } = useRaceSimulation(selectedRaceId);
  const { readiness } = useReadinessScore();

  const futureRaces = allRaces.filter(r => new Date(r.dateISO) >= new Date());

  useEffect(() => {
    async function loadRaces() {
      setRacesLoading(true);
      const races = await listRaces();
      setAllRaces(races);
      const future = races.filter(r => new Date(r.dateISO) >= new Date());
      if (future.length > 0 && !selectedRaceId) {
        setSelectedRaceId(future[0].id);
      }
      setRacesLoading(false);
    }
    loadRaces();
  }, []);

  useEffect(() => {
    async function loadPacingStrategy() {
      if (simulation?.race.id) {
        const strategy = await getPacingStrategy(simulation.race.id);
        setPacingStrategy(strategy);
        setPacingMode(strategy ? 'view' : 'edit');
        setShowPacingForm(!strategy);
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

  const adjustedSimulation = useMemo(() => {
    if (!simulation || Object.keys(overrides).length === 0) {
      return null;
    }

    const overriddenTerrain = calculateOverriddenTerrainFactor(simulation.race, overrides);
    const overriddenElevation = calculateOverriddenElevationFactor(simulation.race, overrides);
    const overriddenClimate = calculateOverriddenClimateFactor(simulation.race, overrides);
    const overriddenFatigue = calculateOverriddenFatiguePenalty(simulation.readinessScore, overrides);

    const adjustedTimeMin = applyOverridesToSimulation(
      simulation.predictedTimeMin,
      {
        terrain: simulation.factors.terrainFactor,
        elevation: simulation.factors.elevationFactor,
        climate: simulation.factors.climateFactor,
        fatigue: simulation.factors.fatiguePenalty,
      },
      {
        terrain: overriddenTerrain,
        elevation: overriddenElevation,
        climate: overriddenClimate,
        fatigue: overriddenFatigue,
      },
      simulation.race.distanceKm,
      overrides.startStrategy
    );

    return {
      predictedTimeMin: adjustedTimeMin,
      factors: {
        terrain: overriddenTerrain,
        elevation: overriddenElevation,
        climate: overriddenClimate,
        fatigue: overriddenFatigue,
      },
    };
  }, [simulation, overrides]);

  const handleResetOverrides = () => {
    setOverrides({});
  };

  const handlePacingSave = async (strategy: DbPacingStrategy) => {
    // Reload from database to ensure consistency
    const reloadedStrategy = await getPacingStrategy(strategy.race_id);
    setPacingStrategy(reloadedStrategy);
    setPacingMode('view');
    setShowPacingForm(false);
  };

  const handlePacingEdit = () => {
    setPacingMode('edit');
    setShowPacingForm(true);
  };

  const handlePacingCancel = () => {
    if (pacingStrategy) {
      setPacingMode('view');
      setShowPacingForm(false);
    }
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

    const autoStrategy: DbPacingStrategy = {
      race_id: simulation.race.id,
      name: `${simulation.race.name} Auto-Generated Plan`,
      mode: 'auto',
      segments: autoSegments,
    };

    setPacingStrategy(autoStrategy);
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  if (loading || racesLoading) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">Race Mode Simulation</h2>
          <p className="small">Loading race simulation...</p>
        </section>
      </div>
    );
  }

  if (error || !simulation) {
    const hasRaces = futureRaces.length > 0;

    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">Race Mode Simulation</h2>

          {hasRaces ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '2rem', marginRight: 12 }}>🏁</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                  {futureRaces[0].name}
                </span>
                <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
                  {futureRaces[0].distanceKm} km • {futureRaces[0].dateISO}
                </div>
              </div>

              <div style={{
                padding: 20,
                background: 'var(--warning-bg)',
                border: '2px solid var(--warning)',
                borderRadius: 12,
                marginTop: 16
              }}>
                <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--warning)' }}>
                  ⚠️ Missing Baseline Data
                </div>
                <p className="small" style={{ lineHeight: 1.6, marginBottom: 12 }}>
                  To generate race predictions, we need at least one of the following:
                </p>
                <ul style={{ marginLeft: 20, lineHeight: 1.8 }}>
                  <li>A past race result logged in your training log</li>
                  <li>Recent training runs (5km or longer) with time data</li>
                  <li>Imported activities from Strava or other platforms</li>
                </ul>
              </div>

              <div className="row" style={{ gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <Link to="/log" className="btn primary">
                  Add Training Data
                </Link>
                <Link to="/settings" className="btn">
                  Connect Strava
                </Link>
                <Link to="/calendar" className="btn">
                  Manage Races
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="small" style={{ color: 'var(--muted)', marginTop: 10 }}>
                No upcoming races found in your calendar.
              </p>
              <p className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
                Add a race to your calendar to see personalized predictions and enable the What-If simulator.
              </p>
              <Link to="/calendar" className="btn primary" style={{ marginTop: 12 }}>
                Add Race to Calendar
              </Link>
            </>
          )}
        </section>
      </div>
    );
  }

  const getConfidenceBadgeColor = (confidence: string) => {
    if (confidence === 'high') return 'var(--good)';
    if (confidence === 'medium') return 'var(--warning)';
    return 'var(--bad)';
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'var(--good)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--bad)';
  };

  const weeksText = simulation.weeksToRace > 0 
    ? (simulation.weeksToRace).toFixed(1) + ' weeks away'
    : 'Race day is here!';

  return (
    <div className="grid" style={{ gap: 20 }}>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 className="h2">Race Mode Simulation</h2>

          <div className="row" style={{ gap: 8 }}>
            {futureRaces.length > 1 && (
              <select
                value={selectedRaceId || ''}
                onChange={(e) => setSelectedRaceId(e.target.value || undefined)}
                className="btn"
              >
                <option value="">Next Priority Race</option>
                {futureRaces.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} - {r.dateISO}
                  </option>
                ))}
              </select>
            )}
            <Link to="/season-plan" className="btn primary">
              View Season Plan
            </Link>
          </div>
        </div>
      </section>

      <section className="card">
        <div style={{
          background: 'linear-gradient(135deg, var(--brand-bg) 0%, var(--bg-secondary) 100%)',
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
          border: '1px solid var(--border)'
        }}>
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '2.5rem' }}>🏁</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{simulation.race.name}</h3>
              <div style={{ color: 'var(--muted)', marginTop: 6, fontSize: '0.95rem' }}>
                {simulation.race.distanceKm} km • {simulation.race.dateISO} • {weeksText}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginTop: 20
          }}>
            <div style={{
              padding: '20px',
              background: 'var(--bg)',
              borderRadius: 10,
              border: '2px solid var(--border)',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 10, fontWeight: 600 }}>
                Predicted Time
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand)', marginBottom: 8 }}>
                {simulation.predictedTimeFormatted}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                {simulation.paceFormatted}/km avg
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'var(--bg)',
              borderRadius: 10,
              border: '2px solid var(--border)',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 10, fontWeight: 600 }}>
                Confidence
              </div>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: getConfidenceBadgeColor(simulation.confidence),
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 8
              }}>
                {simulation.confidence}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                {Math.round(simulation.factors.confidenceScore * 100)}% certainty
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'var(--bg)',
              borderRadius: 10,
              border: '2px solid var(--border)',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 10, fontWeight: 600 }}>
                Readiness
              </div>
              <div style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: getReadinessColor(simulation.readinessScore),
                marginBottom: 8
              }}>
                {simulation.readinessScore}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
                {readiness?.category || 'moderate'}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: 20,
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          borderLeft: '4px solid var(--brand)',
          marginBottom: 24
        }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.5rem' }}>💡</span>
            <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7, flex: 1 }}>
              {simulation.message}
            </p>
          </div>
        </div>

        {simulation.performanceFactors && simulation.performanceFactors.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <FactorBreakdown
              factors={simulation.performanceFactors}
              title="Multi-Factor Performance Analysis"
              groupByImpact={true}
            />
          </div>
        )}

        {simulation.weatherDescription && (
          <div style={{
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 10,
            borderLeft: '4px solid var(--warning)',
            marginTop: 16
          }}>
            <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.25rem' }}>🌡️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>
                  Weather Impact
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                  {simulation.weatherDescription}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card" style={{ background: hasOverrides ? 'var(--brand-bg)' : 'var(--bg)' }}>
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowWhatIf(!showWhatIf)}
        >
          <div>
            <h3 className="h2" style={{ margin: 0, color: hasOverrides ? 'var(--brand)' : 'inherit' }}>
              🔮 What-If Simulator {hasOverrides && '✨'}
            </h3>
            <p className="small" style={{ margin: '4px 0 0 0', color: 'var(--muted)' }}>
              Comprehensive race simulation with conditions, nutrition, energy, and strategy analysis
            </p>
          </div>
          <button className="btn">{showWhatIf ? '▲' : '▼'}</button>
        </div>

        {showWhatIf && simulation && (
          <div style={{ marginTop: 20 }}>
            <WhatIfSimulatorTabs
              simulation={simulation}
              adjustedSimulation={adjustedSimulation}
              overrides={overrides}
              onOverridesChange={setOverrides}
              onResetOverrides={handleResetOverrides}
            />
          </div>
        )}
      </section>

      <section className="card">
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowFactors(!showFactors)}
        >
          <h3 className="h2" style={{ margin: 0 }}>📊 Simulation Factors</h3>
          <button className="btn">{showFactors ? '▲' : '▼'}</button>
        </div>

        {showFactors && (
          <SimulationFactorsCard
            factors={simulation.factors}
            terrainType={simulation.race.terrain}
            elevationMeters={simulation.race.elevationM}
            temperature={simulation.race.temperature}
            readinessScore={simulation.readinessScore}
          />
        )}
      </section>

      <section className="card">
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowPaceBreakdown(!showPaceBreakdown)}
        >
          <h3 className="h2" style={{ margin: 0 }}>Pacing Strategy</h3>
          <div className="row" style={{ gap: 8 }}>
            {pacingStrategy && pacingMode === 'view' && (
              <button
                className="btn small primary"
                onClick={(e) => { e.stopPropagation(); handlePacingEdit(); }}
              >
                Edit Plan
              </button>
            )}
            {!pacingStrategy && !showPacingForm && (
              <button
                className="btn small primary"
                onClick={(e) => { e.stopPropagation(); setShowPacingForm(true); }}
              >
                Create Plan
              </button>
            )}
            <button className="btn">{showPaceBreakdown ? '▲' : '▼'}</button>
          </div>
        </div>

        {showPaceBreakdown && (
          <div style={{ marginTop: 16 }}>
            {showPacingForm ? (
              <PacingStrategyForm
                raceId={simulation.race.id}
                raceName={simulation.race.name}
                raceDistanceKm={simulation.race.distanceKm || 10}
                existingStrategy={pacingStrategy}
                onSave={handlePacingSave}
                onCancel={handlePacingCancel}
                onGenerateAuto={handleGenerateAutoPacing}
              />
            ) : pacingStrategy && pacingStrategy.segments.length > 0 ? (
              <PacingChart segments={pacingStrategy.segments} />
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p className="small" style={{ color: 'var(--muted)', marginBottom: 16 }}>
                  No custom pacing strategy yet. Create one to personalize your race plan.
                </p>
                <button className="btn primary" onClick={() => setShowPacingForm(true)}>
                  Create Pacing Strategy
                </button>
              </div>
            )}

            {pacingStrategy && pacingMode === 'view' && (
              <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div className="small" style={{ color: 'var(--muted)' }}>
                  <strong>{pacingStrategy.name}</strong> • {pacingStrategy.segments.length} segments •
                  {pacingStrategy.mode === 'auto' ? ' Auto-generated' : ' Custom plan'}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card" style={{ background: 'var(--bg-secondary)' }}>
        <h3 className="h2">Race Day Tips</h3>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Start conservatively - aim for Z3 in the first 20%</li>
          <li>Fuel every 30-45 min (200-250 kcal/hour for ultras)</li>
          <li>Monitor HR drift - if zones climb, ease off pace</li>
          {simulation.race.elevationM && simulation.race.elevationM > 500 && (
            <li>Power-hike steep climbs to preserve leg strength</li>
          )}
          {simulation.factors.climateFactor > 1.03 && (
            <li>Hot conditions expected - increase hydration by 20-30%</li>
          )}
        </ul>
      </section>
    </div>
  );
}
