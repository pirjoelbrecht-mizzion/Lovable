import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRaces, type Race } from '@/utils/races';
import { useSeasonPlan } from '@/hooks/useSeasonPlan';
import { useReadinessScore } from '@/hooks/useReadinessScore';
import SeasonWheel from '@/components/SeasonWheel';
import SeasonTimeline from '@/components/SeasonTimeline';
import SeasonPlanEditor from '@/components/SeasonPlanEditor';
import MultiSeasonTabs from '@/components/MultiSeasonTabs';
import ConflictResolutionModal from '@/components/ConflictResolutionModal';
import { getCurrentMacrocycle, getWeeksUntilPhase, generateMultiRaceSeasonPlan, detectSeasonPlanConflict } from '@/utils/seasonPlanGenerator';
import { useT } from '@/i18n';
import type { SeasonPlan as SeasonPlanType } from '@/types/seasonPlan';

export default function SeasonPlan() {
  const t = useT();
  const navigate = useNavigate();
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [racesLoading, setRacesLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState(false);
  const [viewMode, setViewMode] = useState<'circular' | 'linear'>('circular');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictOldDate, setConflictOldDate] = useState('');
  const [conflictNewDate, setConflictNewDate] = useState('');
  const [useMultiRaceMode, setUseMultiRaceMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [useContinuousMode, setUseContinuousMode] = useState(true);

  const { readiness } = useReadinessScore();
  const { seasonPlan, isLoading, error, generatePlan, generateFullPlan, savePlan } = useSeasonPlan(
    selectedRaceId || undefined
  );

  useEffect(() => {
    async function loadRaces() {
      setRacesLoading(true);
      const allRaces = await listRaces();
      const futureRaces = allRaces
        .filter(r => new Date(r.dateISO) >= new Date())
        .sort((a, b) => {
          const dateCompare = a.dateISO.localeCompare(b.dateISO);
          if (dateCompare !== 0) return dateCompare;
          const priorityOrder = { A: 1, B: 2, C: 3 };
          return (priorityOrder[a.priority || 'B'] || 2) - (priorityOrder[b.priority || 'B'] || 2);
        });

      setRaces(futureRaces);

      if (futureRaces.length > 0 && !selectedRaceId) {
        const topRace = futureRaces.find(r => r.priority === 'A') || futureRaces[0];
        setSelectedRaceId(topRace.id);
      }

      setRacesLoading(false);
    }

    loadRaces();
  }, [selectedRaceId]);

  useEffect(() => {
    async function generate() {
      if (useContinuousMode && races.length > 0 && !seasonPlan) {
        await generateFullPlan(races, showHistory);
      } else if (!useContinuousMode && selectedRaceId && !seasonPlan) {
        const race = races.find(r => r.id === selectedRaceId);
        if (race) {
          await generatePlan(race, readiness?.score);
        }
      }
    }

    generate();
  }, [selectedRaceId, races, seasonPlan, generatePlan, generateFullPlan, readiness, useContinuousMode, showHistory]);

  const handleRaceChange = async (raceId: string) => {
    setSelectedRaceId(raceId);
    if (useContinuousMode) {
      await generateFullPlan(races, showHistory);
    } else {
      const race = races.find(r => r.id === raceId);
      if (race) {
        await generatePlan(race, readiness?.score);
      }
    }
  };

  const handleToggleHistory = async () => {
    const newShowHistory = !showHistory;
    setShowHistory(newShowHistory);
    if (useContinuousMode && races.length > 0) {
      await generateFullPlan(races, newShowHistory);
    }
  };

  const handleToggleContinuousMode = async () => {
    const newMode = !useContinuousMode;
    setUseContinuousMode(newMode);
    if (newMode && races.length > 0) {
      await generateFullPlan(races, showHistory);
    } else if (!newMode && selectedRaceId) {
      const race = races.find(r => r.id === selectedRaceId);
      if (race) {
        await generatePlan(race, readiness?.score);
      }
    }
  };

  const handleSave = async () => {
    const success = await savePlan();
    if (success) {
      alert('Season plan saved successfully!');
    } else {
      alert('Failed to save season plan. Please try again.');
    }
  };

  if (racesLoading || isLoading) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">Season Plan</h2>
          <p className="small" style={{ color: 'var(--muted)' }}>Loading...</p>
        </section>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">Season Plan</h2>
          <p className="small" style={{ color: 'var(--muted)', marginTop: 10 }}>
            No upcoming races found. Add a race to your calendar to generate a season plan.
          </p>
          <button className="btn primary" onClick={() => navigate('/races')} style={{ marginTop: 16 }}>
            Add Race
          </button>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid" style={{ gap: 20 }}>
        <section className="card">
          <h2 className="h2">Season Plan</h2>
          <p className="small" style={{ color: 'var(--bad)', marginTop: 10 }}>
            {error}
          </p>
        </section>
      </div>
    );
  }

  const currentMacrocycle = seasonPlan ? getCurrentMacrocycle(seasonPlan) : null;
  const selectedRace = races.find(r => r.id === selectedRaceId);

  const macrocycleGroups = useMultiRaceMode ? generateMultiRaceSeasonPlan(races) : [];
  const hasMultipleARaces = races.filter(r => r.priority === 'A').length > 1;

  const handleSaveEdits = async (updatedPlan: SeasonPlanType) => {
    const success = await savePlan();
    if (success) {
      setIsEditMode(false);
    }
  };

  const handleKeepManualEdits = () => {
    if (seasonPlan) {
      seasonPlan.isOutOfSync = true;
    }
  };

  const handleRegenerate = async () => {
    if (selectedRace) {
      await generatePlan(selectedRace, readiness?.score);
    }
  };

  return (
    <div className="grid" style={{ gap: 20 }}>
      {!useContinuousMode && showConflictModal && conflictOldDate && conflictNewDate && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          oldRaceDate={conflictOldDate}
          newRaceDate={conflictNewDate}
          onKeepManualEdits={handleKeepManualEdits}
          onRegenerate={handleRegenerate}
          onClose={() => setShowConflictModal(false)}
        />
      )}

      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 className="h2">Season Plan</h2>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`btn ${useContinuousMode ? 'primary' : ''}`}
              onClick={handleToggleContinuousMode}
            >
              {useContinuousMode ? '📅 Full Season' : '🎯 Single Race'}
            </button>
            {useContinuousMode && (
              <button
                className={`btn ${showHistory ? 'primary' : ''}`}
                onClick={handleToggleHistory}
              >
                {showHistory ? '👁️ All Phases' : '⏭️ Future Only'}
              </button>
            )}
            {!useContinuousMode && hasMultipleARaces && (
              <button
                className={`btn ${useMultiRaceMode ? 'primary' : ''}`}
                onClick={() => setUseMultiRaceMode(!useMultiRaceMode)}
              >
                {useMultiRaceMode ? 'Single Race' : 'Multi-Race'} Mode
              </button>
            )}
            {!useContinuousMode && !useMultiRaceMode && races.length > 1 && (
              <select
                value={selectedRaceId || ''}
                onChange={(e) => handleRaceChange(e.target.value)}
                className="btn"
              >
                {races.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.priority || 'B'}) - {new Date(r.dateISO).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
            <button
              className={`btn ${viewMode === 'circular' ? 'primary' : ''}`}
              onClick={() => setViewMode('circular')}
            >
              ◯ Circular
            </button>
            <button
              className={`btn ${viewMode === 'linear' ? 'primary' : ''}`}
              onClick={() => setViewMode('linear')}
            >
              ▬ Linear
            </button>
            {!useMultiRaceMode && seasonPlan && !isEditMode && (
              <button className="btn" onClick={() => setIsEditMode(true)}>
                ✏️ Edit Plan
              </button>
            )}
            <button className="btn" onClick={() => navigate('/races')}>
              Manage Events
            </button>
          </div>
        </div>

        {seasonPlan?.isOutOfSync && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: 'var(--warning-bg)',
              border: '1px solid var(--warning)',
              borderRadius: 6,
            }}
          >
            <div className="small" style={{ color: 'var(--warning)' }}>
              ⚠️ <strong>Out of Sync:</strong> This plan contains manual edits that may not align with current race dates.
            </div>
          </div>
        )}
      </section>

      {useContinuousMode && seasonPlan?.macrocycleGroups && seasonPlan.macrocycleGroups.length > 0 && (
        <section
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%)',
            border: '2px solid var(--brand)',
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '2rem' }}>📅</span>
            <div>
              <h3 className="h2" style={{ margin: 0 }}>
                {seasonPlan.macrocycleGroups.length} Race{seasonPlan.macrocycleGroups.length !== 1 ? 's' : ''} Ahead
              </h3>
              <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                {seasonPlan.macrocycleGroups.map((g, i) => (
                  <span key={g.raceId}>
                    {g.raceName} ({g.priority}){i < seasonPlan.macrocycleGroups!.length - 1 ? ' • ' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {currentMacrocycle && (
            <div
              style={{
                padding: 16,
                background: 'var(--bg)',
                borderRadius: 8,
                borderLeft: `4px solid ${currentMacrocycle.color}`,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Current Phase: {currentMacrocycle.displayName}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>
                {currentMacrocycle.description}
              </div>
            </div>
          )}
        </section>
      )}

      {!useContinuousMode && selectedRace && (
        <section
          className="card"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%)',
            border: '2px solid var(--brand)',
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '2rem' }}>🎯</span>
            <div>
              <h3 className="h2" style={{ margin: 0 }}>
                {selectedRace.name}
              </h3>
              <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                {selectedRace.distanceKm} km • {new Date(selectedRace.dateISO).toLocaleDateString()} • Priority {selectedRace.priority || 'B'}
              </div>
            </div>
          </div>

          {currentMacrocycle && (
            <div
              style={{
                padding: 16,
                background: 'var(--bg)',
                borderRadius: 8,
                borderLeft: `4px solid ${currentMacrocycle.color}`,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Current Phase: {currentMacrocycle.displayName}
              </div>
              <div className="small" style={{ color: 'var(--muted)' }}>
                {currentMacrocycle.description}
              </div>
              <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                Week {Math.ceil((new Date().getTime() - new Date(currentMacrocycle.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} of {currentMacrocycle.durationWeeks}
              </div>
            </div>
          )}
        </section>
      )}

      {!useMultiRaceMode && isEditMode && seasonPlan && (
        <SeasonPlanEditor
          seasonPlan={seasonPlan}
          onSave={handleSaveEdits}
          onCancel={() => setIsEditMode(false)}
        />
      )}

      {!useMultiRaceMode && !isEditMode && seasonPlan && (
        <section className="card">
          <h3 className="h2" style={{ marginBottom: 20 }}>
            {useContinuousMode ? 'Training Roadmap' : '12-Month Training Overview'}
          </h3>
          {viewMode === 'circular' ? (
            <SeasonWheel seasonPlan={seasonPlan} />
          ) : (
            <SeasonTimeline seasonPlan={seasonPlan} />
          )}
        </section>
      )}

      {useMultiRaceMode && macrocycleGroups.length > 0 && (
        <MultiSeasonTabs macrocycleGroups={macrocycleGroups} viewMode={viewMode} />
      )}

      {!useMultiRaceMode && !isEditMode && seasonPlan && (
        <section className="card">
          <div
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpandedPhases(!expandedPhases)}
          >
            <h3 className="h2" style={{ margin: 0 }}>
              {useContinuousMode ? 'Phase-by-Phase Breakdown' : 'Training Phases Breakdown'}
            </h3>
            <button className="btn">{expandedPhases ? '▲' : '▼'}</button>
          </div>

          {expandedPhases && (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {seasonPlan.macrocycles.map((macrocycle, idx) => {
                const today = new Date();
                const phaseStart = new Date(macrocycle.startDate);
                const phaseEnd = new Date(macrocycle.endDate);
                const isCurrent = today >= phaseStart && today <= phaseEnd;
                const isUpcoming = today < phaseStart;
                const isPast = today > phaseEnd;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      background: isCurrent ? 'var(--brand-bg)' : 'var(--bg-secondary)',
                      borderRadius: 8,
                      borderLeft: `4px solid ${macrocycle.color}`,
                      opacity: showHistory ? (isPast ? 0.5 : 1) : 1,
                    }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                          {macrocycle.displayName}
                          {isCurrent && <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--brand)' }}>● Current</span>}
                          {macrocycle.raceId && seasonPlan.macrocycleGroups && (
                            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                              → {seasonPlan.macrocycleGroups.find(g => g.raceId === macrocycle.raceId)?.raceName}
                            </span>
                          )}
                        </div>
                        <div className="small" style={{ color: 'var(--muted)', marginTop: 4 }}>
                          {macrocycle.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="small" style={{ fontWeight: 600 }}>
                          {macrocycle.durationWeeks} weeks
                        </div>
                        <div className="small" style={{ color: 'var(--muted)', marginTop: 2 }}>
                          Intensity: {Math.round(macrocycle.intensity * 100)}%
                        </div>
                      </div>
                    </div>
                    <div className="small" style={{ color: 'var(--muted)', marginTop: 8 }}>
                      {new Date(macrocycle.startDate).toLocaleDateString()} - {new Date(macrocycle.endDate).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!useMultiRaceMode && !isEditMode && seasonPlan && (
        <section className="card" style={{ background: 'var(--bg-secondary)' }}>
          <h3 className="h2">Training Tips</h3>
          {currentMacrocycle && (
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              {currentMacrocycle.phase === 'base_building' && (
                <>
                  <li>Focus on building aerobic base with easy runs</li>
                  <li>Gradually increase weekly mileage by 10-15%</li>
                  <li>Include one long run per week</li>
                  <li>Prioritize consistency over intensity</li>
                </>
              )}
              {currentMacrocycle.phase === 'sharpening' && (
                <>
                  <li>Add tempo runs and threshold workouts</li>
                  <li>Include race-pace intervals</li>
                  <li>Maintain weekly mileage but increase intensity</li>
                  <li>Practice nutrition and hydration strategies</li>
                </>
              )}
              {currentMacrocycle.phase === 'taper' && (
                <>
                  <li>Reduce volume by 40-60%</li>
                  <li>Maintain intensity but shorten workouts</li>
                  <li>Prioritize sleep and recovery</li>
                  <li>Finalize race day strategy and nutrition plan</li>
                </>
              )}
              {currentMacrocycle.phase === 'race' && (
                <>
                  <li>Trust your training and stick to your plan</li>
                  <li>Start conservatively - first 20% at easy pace</li>
                  <li>Execute your nutrition and hydration strategy</li>
                  <li>Monitor effort and adjust if needed</li>
                </>
              )}
              {currentMacrocycle.phase === 'recovery' && (
                <>
                  <li>Allow full physiological recovery</li>
                  <li>Keep runs easy and short</li>
                  <li>Focus on sleep, nutrition, and stress management</li>
                  <li>Reflect on race performance and lessons learned</li>
                </>
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
