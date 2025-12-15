import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Calendar, Map, TrendingUp, ChevronRight } from 'lucide-react';
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
import './RaceMode.css';

export default function RaceMode() {
  const t = useT();
  const [selectedRaceId, setSelectedRaceId] = useState<string | undefined>(undefined);
  const [allRaces, setAllRaces] = useState<Race[]>([]);
  const [racesLoading, setRacesLoading] = useState(true);
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

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'high') return 'race-stat-value-good';
    if (confidence === 'medium') return 'race-stat-value-warning';
    return 'race-stat-value-bad';
  };

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'race-stat-value-good';
    if (score >= 60) return 'race-stat-value-warning';
    return 'race-stat-value-bad';
  };

  if (loading || racesLoading) {
    return (
      <div className="race-container">
        <div className="race-bg-orbs">
          <div className="race-orb race-orb-coral" />
          <div className="race-orb race-orb-orange" />
          <div className="race-orb race-orb-amber" />
        </div>
        <div className="race-content">
          <div className="race-header-card">
            <div className="race-header-top">
              <div className="race-header-left">
                <div className="race-header-icon">
                  <Flag size={20} />
                </div>
                <h1 className="race-header-title">Race Mode</h1>
              </div>
            </div>
          </div>
          <div className="race-section">
            <div className="race-loading">
              <div className="race-loading-spinner" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !simulation) {
    const hasRaces = futureRaces.length > 0;

    return (
      <div className="race-container">
        <div className="race-bg-orbs">
          <div className="race-orb race-orb-coral" />
          <div className="race-orb race-orb-orange" />
          <div className="race-orb race-orb-amber" />
        </div>
        <div className="race-content">
          <div className="race-header-card">
            <div className="race-header-top">
              <div className="race-header-left">
                <div className="race-header-icon">
                  <Flag size={20} />
                </div>
                <h1 className="race-header-title">Race Mode</h1>
              </div>
              <div className="race-header-nav">
                <Link to="/season-plan" className="race-nav-btn">
                  <Calendar size={14} />
                  <span>Season Plan</span>
                </Link>
                <Link to="/calendar" className="race-nav-btn">
                  <TrendingUp size={14} />
                  <span>Calendar</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="race-section">
            <div className="race-section-content">
              {hasRaces ? (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <span style={{ fontSize: '2.5rem' }}>🏁</span>
                      <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                          {futureRaces[0].name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                          {futureRaces[0].distanceKm} km - {futureRaces[0].dateISO}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    padding: 20,
                    background: 'rgba(255, 183, 77, 0.1)',
                    border: '1px solid rgba(255, 183, 77, 0.3)',
                    borderRadius: 12,
                    marginBottom: 20
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 12, color: '#FFB74D', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Missing Baseline Data</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 12 }}>
                      To generate race predictions, we need at least one of the following:
                    </p>
                    <ul style={{ marginLeft: 20, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)' }}>
                      <li>A past race result logged in your training log</li>
                      <li>Recent training runs (5km or longer) with time data</li>
                      <li>Imported activities from Strava or other platforms</li>
                    </ul>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/log" className="race-section-btn race-section-btn-primary">
                      Add Training Data
                    </Link>
                    <Link to="/settings" className="race-section-btn">
                      Connect Strava
                    </Link>
                    <Link to="/calendar" className="race-section-btn">
                      Manage Races
                    </Link>
                  </div>
                </>
              ) : (
                <div className="race-empty-state">
                  <div className="race-empty-icon">🏁</div>
                  <p className="race-empty-text">
                    No upcoming races found in your calendar.<br />
                    Add a race to see personalized predictions and enable the What-If simulator.
                  </p>
                  <Link to="/calendar" className="race-section-btn race-section-btn-primary">
                    Add Race to Calendar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const weeksText = simulation.weeksToRace > 0
    ? (simulation.weeksToRace).toFixed(1) + ' weeks away'
    : 'Race day is here!';

  return (
    <div className="race-container">
      <div className="race-bg-orbs">
        <div className="race-orb race-orb-coral" />
        <div className="race-orb race-orb-orange" />
        <div className="race-orb race-orb-amber" />
        <div className="race-orb race-orb-coral-bottom" />
      </div>

      <div className="race-content">
        <div className="race-header-card">
          <div className="race-header-top">
            <div className="race-header-left">
              <div className="race-header-icon">
                <Flag size={20} />
              </div>
              <h1 className="race-header-title">Race Mode</h1>
            </div>
            <div className="race-header-nav">
              {futureRaces.length > 1 && (
                <select
                  value={selectedRaceId || ''}
                  onChange={(e) => setSelectedRaceId(e.target.value || undefined)}
                  className="race-selector"
                >
                  <option value="">Next Priority Race</option>
                  {futureRaces.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.dateISO}
                    </option>
                  ))}
                </select>
              )}
              <Link to="/season-plan" className="race-nav-btn">
                <Calendar size={14} />
                <span>Season Plan</span>
              </Link>
              <Link to="/calendar" className="race-nav-btn">
                <TrendingUp size={14} />
                <span>Calendar</span>
              </Link>
              <Link to="/route-explorer" className="race-nav-btn">
                <Map size={14} />
                <span>Routes</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="race-hero-card">
          <div className="race-hero-header">
            <span className="race-hero-emoji">🏁</span>
            <div className="race-hero-info">
              <h2 className="race-hero-name">{simulation.race.name}</h2>
              <div className="race-hero-meta">
                <span>{simulation.race.distanceKm} km</span>
                <span>-</span>
                <span>{simulation.race.dateISO}</span>
                <span>-</span>
                <span className="race-hero-countdown">{weeksText}</span>
              </div>
            </div>
          </div>

          <div className="race-hero-stats">
            <div className="race-stat-card race-stat-card-primary">
              <div className="race-stat-label">Predicted Time</div>
              <div className="race-stat-value">{simulation.predictedTimeFormatted}</div>
              <div className="race-stat-sub">{simulation.paceFormatted}/km avg</div>
              {simulation.calculationMethod && (
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: simulation.calculationMethod === 'gpx'
                      ? 'rgba(76, 175, 80, 0.2)'
                      : simulation.calculationMethod === 'manual'
                      ? 'rgba(33, 150, 243, 0.2)'
                      : 'rgba(255, 152, 0, 0.2)',
                    color: simulation.calculationMethod === 'gpx'
                      ? '#4CAF50'
                      : simulation.calculationMethod === 'manual'
                      ? '#2196F3'
                      : '#FF9800',
                    border: `1px solid ${simulation.calculationMethod === 'gpx'
                      ? 'rgba(76, 175, 80, 0.4)'
                      : simulation.calculationMethod === 'manual'
                      ? 'rgba(33, 150, 243, 0.4)'
                      : 'rgba(255, 152, 0, 0.4)'}`,
                  }}>
                    {simulation.calculationMethod === 'gpx' && '📍 GPX-Based'}
                    {simulation.calculationMethod === 'manual' && '✏️ Manual Entry'}
                    {simulation.calculationMethod === 'projection' && '📊 Projected'}
                  </span>
                </div>
              )}
            </div>

            <div className="race-stat-card">
              <div className="race-stat-label">Confidence</div>
              <div className={`race-stat-value ${getConfidenceColor(simulation.confidence)}`} style={{ textTransform: 'uppercase', fontSize: '24px' }}>
                {simulation.confidence}
              </div>
              <div className="race-stat-sub">{Math.round(simulation.factors.confidenceScore * 100)}% certainty</div>
              {simulation.calculationConfidence && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                  {simulation.calculationConfidence === 'very-high' && 'Very High Accuracy'}
                  {simulation.calculationConfidence === 'high' && 'High Accuracy'}
                  {simulation.calculationConfidence === 'medium' && 'Moderate Accuracy'}
                  {simulation.calculationConfidence === 'low' && 'Low Accuracy'}
                  {simulation.calculationConfidence === 'very-low' && 'Very Low Accuracy'}
                </div>
              )}
            </div>

            <div className="race-stat-card">
              <div className="race-stat-label">Readiness</div>
              <div className={`race-stat-value ${getReadinessColor(simulation.readinessScore)}`}>
                {simulation.readinessScore}
              </div>
              <div className="race-stat-sub" style={{ textTransform: 'capitalize' }}>{readiness?.category || 'moderate'}</div>
            </div>
          </div>

          <div className="race-hero-message">
            <span className="race-hero-message-icon">💡</span>
            <p className="race-hero-message-text">{simulation.message}</p>
          </div>

          {simulation.calculationMethod === 'projection' && (simulation.calculationConfidence === 'low' || simulation.calculationConfidence === 'very-low') && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: '#FF9800', marginBottom: '4px' }}>Low Confidence Projection</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  This prediction is based on mathematical projection from different race distances. For more accurate predictions:
                  <ul style={{ marginTop: '8px', marginLeft: '20px', marginBottom: 0 }}>
                    <li>Upload a GPX file of the race route in the Calendar</li>
                    <li>Add similar distance race results to your training log</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {simulation.performanceFactors && simulation.performanceFactors.length > 0 && (
          <div className="race-section">
            <div className="race-section-header">
              <div className="race-section-title-group">
                <div className="race-section-icon">📊</div>
                <div>
                  <h3 className="race-section-title">Performance Analysis</h3>
                  <div className="race-section-subtitle">Multi-factor breakdown</div>
                </div>
              </div>
            </div>
            <div className="race-section-content">
              <FactorBreakdown
                factors={simulation.performanceFactors}
                groupByImpact={true}
              />
            </div>
          </div>
        )}

        <div className={`race-section ${hasOverrides ? 'race-section-whatif-active' : ''}`}>
          <div className="race-section-header">
            <div className="race-section-title-group">
              <div className="race-section-icon">🔮</div>
              <div>
                <h3 className="race-section-title">What-If Simulator {hasOverrides && '✨'}</h3>
                <div className="race-section-subtitle">Explore conditions, nutrition, and strategy</div>
              </div>
            </div>
            {hasOverrides && (
              <div className="race-section-actions">
                <button className="race-section-btn" onClick={handleResetOverrides}>
                  Reset
                </button>
              </div>
            )}
          </div>
          <div className="race-section-content" style={{ maxHeight: '700px' }}>
            <WhatIfSimulatorTabs
              simulation={simulation}
              adjustedSimulation={adjustedSimulation}
              overrides={overrides}
              onOverridesChange={setOverrides}
              onResetOverrides={handleResetOverrides}
            />
          </div>
        </div>

        <div className="race-section">
          <div className="race-section-header">
            <div className="race-section-title-group">
              <div className="race-section-icon">📈</div>
              <div>
                <h3 className="race-section-title">Simulation Factors</h3>
                <div className="race-section-subtitle">Environmental and physiological impacts</div>
              </div>
            </div>
          </div>
          <div className="race-section-content">
            <SimulationFactorsCard
              factors={simulation.factors}
              terrainType={simulation.race.terrain}
              elevationMeters={simulation.race.elevationM}
              temperature={simulation.race.temperature}
              readinessScore={simulation.readinessScore}
            />
          </div>
        </div>

        <div className="race-section">
          <div className="race-section-header">
            <div className="race-section-title-group">
              <div className="race-section-icon">⏱️</div>
              <div>
                <h3 className="race-section-title">Pacing Strategy</h3>
                <div className="race-section-subtitle">
                  {pacingStrategy ? `${pacingStrategy.segments.length} segments` : 'Create your race plan'}
                </div>
              </div>
            </div>
            <div className="race-section-actions">
              {pacingStrategy && pacingMode === 'view' && (
                <button className="race-section-btn" onClick={handlePacingEdit}>
                  Edit Plan
                </button>
              )}
              {!pacingStrategy && !showPacingForm && (
                <>
                  <button className="race-section-btn" onClick={handleGenerateAutoPacing}>
                    Auto-Generate
                  </button>
                  <button className="race-section-btn race-section-btn-primary" onClick={() => setShowPacingForm(true)}>
                    Create Plan
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="race-section-content">
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
              <>
                <PacingChart segments={pacingStrategy.segments} />
                <div className="race-pacing-info">
                  <strong>{pacingStrategy.name}</strong> - {pacingStrategy.segments.length} segments -
                  {pacingStrategy.mode === 'auto' ? ' Auto-generated' : ' Custom plan'}
                </div>
              </>
            ) : (
              <div className="race-empty-state">
                <div className="race-empty-icon">⏱️</div>
                <p className="race-empty-text">
                  No pacing strategy yet. Create one to personalize your race plan.
                </p>
                <button className="race-section-btn race-section-btn-primary" onClick={() => setShowPacingForm(true)}>
                  Create Pacing Strategy
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="race-section">
          <div className="race-section-header">
            <div className="race-section-title-group">
              <div className="race-section-icon">💡</div>
              <div>
                <h3 className="race-section-title">Race Day Tips</h3>
                <div className="race-section-subtitle">Key strategies for success</div>
              </div>
            </div>
          </div>
          <div className="race-section-content">
            <ul className="race-tips-list">
              <li className="race-tip-item">
                <span className="race-tip-icon">🚀</span>
                <span className="race-tip-text">Start conservatively - aim for Z3 in the first 20%</span>
              </li>
              <li className="race-tip-item">
                <span className="race-tip-icon">🍌</span>
                <span className="race-tip-text">Fuel every 30-45 min (200-250 kcal/hour for ultras)</span>
              </li>
              <li className="race-tip-item">
                <span className="race-tip-icon">❤️</span>
                <span className="race-tip-text">Monitor HR drift - if zones climb, ease off pace</span>
              </li>
              {simulation.race.elevationM && simulation.race.elevationM > 500 && (
                <li className="race-tip-item">
                  <span className="race-tip-icon">⛰️</span>
                  <span className="race-tip-text">Power-hike steep climbs to preserve leg strength</span>
                </li>
              )}
              {simulation.factors.climateFactor > 1.03 && (
                <li className="race-tip-item">
                  <span className="race-tip-icon">🌡️</span>
                  <span className="race-tip-text">Hot conditions expected - increase hydration by 20-30%</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {simulation.weatherDescription && (
          <div className="race-section">
            <div className="race-section-header">
              <div className="race-section-title-group">
                <div className="race-section-icon">🌤️</div>
                <div>
                  <h3 className="race-section-title">Weather Impact</h3>
                  <div className="race-section-subtitle">Conditions forecast</div>
                </div>
              </div>
            </div>
            <div className="race-section-content">
              <div className="race-hero-message">
                <span className="race-hero-message-icon">🌡️</span>
                <p className="race-hero-message-text">{simulation.weatherDescription}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
